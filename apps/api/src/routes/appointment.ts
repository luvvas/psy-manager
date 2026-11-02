import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { appointmentCommands } from "../cqrs/appointment/appointment.commands";
import { appointmentQueries } from "../cqrs/appointment/appointment.queries";
import { googleCalendarService } from "../services/google-calendar.service";
import { db } from "../db";
import { account } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { assertClinicMembership, assertPatientOwnership, assertRoomAccess } from "../lib/ownership";
import { optionalHttpUrl } from "../utils/url.utils";
import { consumeOAuthState, issueOAuthState } from "../lib/oauth-state";
import { TRPCError } from "@trpc/server";
import { availabilityService } from "../services/availability.service";
import { TIME_HHMM } from "../lib/work-schedule";

const dateInput = z.string().or(z.date()).transform((val) => new Date(val));
const timeInput = z.string().regex(TIME_HHMM, "Use o formato HH:MM");

// Conflito com a própria agenda e sessão fora do expediente não bloqueiam de
// vez: o formulário avisa e a psicóloga confirma (sessão extra, reposição).
// Sem a confirmação, a API recusa, o que também pega o caso de outra aba ter
// marcado o mesmo horário entre o aviso e o salvar.
// Sala ocupada é diferente: bloqueia sempre, a confirmação não vale para ela.
const confirmField = { allowScheduleConflicts: z.boolean().optional().default(false) };
const roomField = { roomId: z.string().min(1).optional().nullable() };

/**
 * A sala é ocupada por onde a psicóloga está, não pelo canal: sessão online
 * atendida de uma sala da clínica também reserva a sala. A clínica vem da sala
 * (nunca do cliente) depois de checar que a psicóloga é membro ativo dela.
 */
async function resolveRoom(psychologistId: string, input: { roomId?: string | null }) {
    if (!input.roomId) return { roomId: null, clinicId: null };
    const room = await assertRoomAccess(input.roomId, psychologistId);
    return { roomId: room.id, clinicId: room.clinicId };
}

async function assertSlotAccepted(
    psychologistId: string,
    input: {
        date: Date;
        startTime: string;
        endTime: string;
        status: string;
        allowScheduleConflicts: boolean;
        roomId: string | null;
    },
    excludeId?: string
) {
    if (input.startTime >= input.endTime) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O fim da sessão deve ser depois do início." });
    }
    if (input.status === "cancelled") return;

    const { conflicts, roomConflicts, outsideSchedule } = await availabilityService.checkSlot(psychologistId, {
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        excludeId,
        roomId: input.roomId,
    });

    if (roomConflicts.length > 0) {
        const who = roomConflicts
            .map((c) => `das ${c.startTime} às ${c.endTime} (${c.isOwn ? "sua sessão" : c.psychologistName})`)
            .join(", ");
        throw new TRPCError({
            code: "CONFLICT",
            message: `A sala já está ocupada ${who}. Escolha outra sala ou outro horário.`,
        });
    }

    if (input.allowScheduleConflicts) return;

    const problems: string[] = [];
    if (conflicts.length > 0) {
        problems.push(
            `já existe sessão das ${conflicts.map((c) => `${c.startTime} às ${c.endTime}`).join(", ")}`
        );
    }
    if (outsideSchedule) problems.push("o horário está fora do seu expediente");

    if (problems.length > 0) {
        throw new TRPCError({
            code: "CONFLICT",
            message: `Confirme o agendamento: ${problems.join(" e ")}.`,
        });
    }
}

/** checkSlot/freeSlots: só sonda salas e clínicas das quais a psicóloga é membro. */
async function resolveRoomScope(psychologistId: string, input: { roomId?: string | null; clinicId?: string | null }) {
    if (input.roomId) {
        const room = await assertRoomAccess(input.roomId, psychologistId);
        return { roomId: room.id, clinicId: room.clinicId };
    }
    if (input.clinicId) {
        await assertClinicMembership(input.clinicId, psychologistId);
        return { roomId: null, clinicId: input.clinicId };
    }
    return { roomId: null, clinicId: null };
}

const reminderFields = {
    reminderEnabled: z.boolean().optional().default(false),
    reminderMinutesBefore: z.number().int().positive().optional(),
};

export const appointmentRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        return appointmentQueries.list(ctx.session.user.id);
    }),

    create: protectedProcedure
        .input(
            z.object({
                patientId: z.string().min(1),
                date: dateInput,
                startTime: timeInput,
                endTime: timeInput,
                status: z.string().min(1),
                sessionType: z.string().min(1),
                type: z.string().min(1),
                isRecurring: z.boolean(),
                notes: z.string().optional(),
                meetingUrl: optionalHttpUrl,
                ...reminderFields,
                ...confirmField,
                ...roomField,
            })
        )
        .mutation(async ({ ctx, input }) => {
            await assertPatientOwnership(input.patientId, ctx.session.user.id);
            const room = await resolveRoom(ctx.session.user.id, input);
            await assertSlotAccepted(ctx.session.user.id, { ...input, roomId: room.roomId });
            const { allowScheduleConflicts: _confirmed, ...data } = input;
            const id = await appointmentCommands.schedule({
                ...data,
                ...room,
                psychologistId: ctx.session.user.id,
            });

            return { id, success: true };
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
                patientId: z.string().min(1),
                date: dateInput,
                startTime: timeInput,
                endTime: timeInput,
                status: z.string().min(1),
                sessionType: z.string().min(1),
                type: z.string().min(1),
                isRecurring: z.boolean(),
                notes: z.string().optional(),
                meetingUrl: optionalHttpUrl,
                ...reminderFields,
                ...confirmField,
                ...roomField,
            })
        )
        .mutation(async ({ ctx, input }) => {
            await assertPatientOwnership(input.patientId, ctx.session.user.id);
            const room = await resolveRoom(ctx.session.user.id, input);
            await assertSlotAccepted(ctx.session.user.id, { ...input, roomId: room.roomId }, input.id);
            const { allowScheduleConflicts: _confirmed, ...data } = input;
            await appointmentCommands.reschedule({
                ...data,
                ...room,
                psychologistId: ctx.session.user.id,
            });

            return { success: true };
        }),

    /** Aviso em tempo real no formulário: conflitos e expediente do horário escolhido. */
    checkSlot: protectedProcedure
        .input(
            z.object({
                date: dateInput,
                startTime: timeInput,
                endTime: timeInput,
                excludeId: z.string().optional(),
                roomId: z.string().min(1).optional().nullable(),
                clinicId: z.string().min(1).optional().nullable(),
            })
        )
        .query(async ({ ctx, input }) => {
            const scope = await resolveRoomScope(ctx.session.user.id, input);
            return availabilityService.checkSlot(ctx.session.user.id, { ...input, ...scope });
        }),

    /** Horários livres do dia dentro do expediente, para o agendamento rápido. */
    freeSlots: protectedProcedure
        .input(
            z.object({
                date: dateInput,
                excludeId: z.string().optional(),
                roomId: z.string().min(1).optional().nullable(),
                clinicId: z.string().min(1).optional().nullable(),
            })
        )
        .query(async ({ ctx, input }) => {
            const scope = await resolveRoomScope(ctx.session.user.id, input);
            return availabilityService.freeSlots(ctx.session.user.id, { ...input, ...scope });
        }),

    delete: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await appointmentCommands.cancel({
                id: input.id,
                psychologistId: ctx.session.user.id,
            });
            return { success: true };
        }),

    isConnectedGoogle: protectedProcedure.query(async ({ ctx }) => {
        return googleCalendarService.isConnected(ctx.session.user.id);
    }),

    syncGoogle: protectedProcedure.mutation(async ({ ctx }) => {
        return googleCalendarService.syncEvents(ctx.session.user.id);
    }),

    getGoogleAuthUrl: protectedProcedure.query(async ({ ctx }) => {
        const clientId = process.env.GOOGLE_CLIENT_ID || "";
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/google-callback";
        const scope = "https://www.googleapis.com/auth/calendar.readonly";
        const url = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: scope,
            access_type: "offline",
            prompt: "consent",
            state: issueOAuthState(ctx.session.user.id),
        }).toString();
        return { url };
    }),

    connectGoogleCalendar: protectedProcedure
        .input(z.object({ code: z.string(), state: z.string() }))
        .mutation(async ({ ctx, input }) => {
            if (!consumeOAuthState(input.state, ctx.session.user.id)) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Link de conexão inválido ou expirado. Clique em conectar novamente.",
                });
            }
            const now = new Date();
            const response = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID || "",
                    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                    code: input.code,
                    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/google-callback",
                    grant_type: "authorization_code",
                }),
            });

            if (!response.ok) {
                console.error("Google OAuth exchange failed, status:", response.status);
                throw new Error("Falha ao conectar com o Google Calendar. Tente novamente.");
            }

            const data = await response.json();
            const accessToken = data.access_token;
            const refreshToken = data.refresh_token;
            const expiresIn = data.expires_in;
            const expiresAt = new Date(now.getTime() + expiresIn * 1000);

            const [existing] = await db
                .select()
                .from(account)
                .where(
                    and(
                        eq(account.userId, ctx.session.user.id),
                        eq(account.providerId, "google")
                    )
                );

            if (existing) {
                await db
                    .update(account)
                    .set({
                        accessToken,
                        refreshToken: refreshToken || existing.refreshToken,
                        accessTokenExpiresAt: expiresAt,
                        updatedAt: now,
                    })
                    .where(eq(account.id, existing.id));
            } else {
                await db.insert(account).values({
                    id: crypto.randomUUID(),
                    accountId: ctx.session.user.id,
                    providerId: "google",
                    userId: ctx.session.user.id,
                    accessToken,
                    refreshToken,
                    accessTokenExpiresAt: expiresAt,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            return { success: true };
        }),
});
