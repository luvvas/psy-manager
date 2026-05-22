import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/index";
import { appointmentCommands } from "../cqrs/appointment/appointment.commands";
import { appointmentQueries } from "../cqrs/appointment/appointment.queries";
import { googleCalendarService } from "../services/google-calendar.service";
import { db } from "../db";
import { account, patient } from "../db/schema";
import { eq, and } from "drizzle-orm";

async function assertPatientOwnership(patientId: string, psychologistId: string) {
    const [row] = await db
        .select({ id: patient.id })
        .from(patient)
        .where(and(eq(patient.id, patientId), eq(patient.psychologistId, psychologistId)))
        .limit(1);
    if (!row) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Paciente não encontrado." });
    }
}

export const appointmentRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        return appointmentQueries.list(ctx.session.user.id);
    }),

    create: protectedProcedure
        .input(
            z.object({
                patientId: z.string().min(1),
                date: z.string().or(z.date()).transform((val) => new Date(val)),
                startTime: z.string().min(1),
                endTime: z.string().min(1),
                status: z.string().min(1),
                sessionType: z.string().min(1),
                type: z.string().min(1),
                isRecurring: z.boolean(),
                notes: z.string().optional(),
                meetingUrl: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await assertPatientOwnership(input.patientId, ctx.session.user.id);
            const id = await appointmentCommands.schedule({
                ...input,
                psychologistId: ctx.session.user.id,
            });
            return { id, success: true };
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
                patientId: z.string().min(1),
                date: z.string().or(z.date()).transform((val) => new Date(val)),
                startTime: z.string().min(1),
                endTime: z.string().min(1),
                status: z.string().min(1),
                sessionType: z.string().min(1),
                type: z.string().min(1),
                isRecurring: z.boolean(),
                notes: z.string().optional(),
                meetingUrl: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await assertPatientOwnership(input.patientId, ctx.session.user.id);
            await appointmentCommands.reschedule({
                ...input,
                psychologistId: ctx.session.user.id,
            });
            return { success: true };
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
            state: ctx.session.user.id,
        }).toString();
        return { url };
    }),

    connectGoogleCalendar: protectedProcedure
        .input(z.object({ code: z.string() }))
        .mutation(async ({ ctx, input }) => {
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
                const body = await response.text();
                console.error("Google OAuth exchange failed:", body);
                throw new Error("Falha ao conectar com o Google Calendar. Tente novamente.");
            }

            const data = await response.json();
            const accessToken = data.access_token;
            const refreshToken = data.refresh_token;
            const expiresIn = data.expires_in;
            const expiresAt = new Date(now.getTime() + expiresIn * 1000);

            // Save/Update in account table
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
