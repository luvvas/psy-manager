import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { videoSessionService } from "../services/video-session.service";
import { protectedProcedure, publicProcedure, router } from "../trpc/index";
import { createAuthToken } from "../ws/rooms";
import { assertAppointmentOwnership } from "../lib/ownership";

const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:5173";
const CF_TURN_KEY_ID = process.env.CF_TURN_KEY_ID;
const CF_TURN_API_TOKEN = process.env.CF_TURN_API_TOKEN;
const TURN_CREDENTIAL_TTL_SECONDS = 4 * 60 * 60;

type IceServer = { urls: string | string[]; username?: string; credential?: string };

const STUN_ONLY: IceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

async function getIceServers(): Promise<IceServer[]> {
    if (!CF_TURN_KEY_ID || !CF_TURN_API_TOKEN) return STUN_ONLY;

    try {
        const res = await fetch(
            `https://rtc.live.cloudflare.com/v1/turn/keys/${CF_TURN_KEY_ID}/credentials/generate-ice-servers`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${CF_TURN_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ttl: TURN_CREDENTIAL_TTL_SECONDS }),
            }
        );
        if (!res.ok) throw new Error(`Cloudflare TURN responded ${res.status}`);
        const body = (await res.json()) as { iceServers?: IceServer[] };
        return body.iceServers?.length ? body.iceServers : STUN_ONLY;
    } catch (err) {
        console.error("[video-session] Failed to generate TURN credentials:", err);
        return STUN_ONLY;
    }
}

export const videoSessionRouter = router({
    create: protectedProcedure
        .input(z.object({ appointmentId: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
            if (input.appointmentId) await assertAppointmentOwnership(input.appointmentId, ctx.session.user.id);
            const { id, patientToken } = await videoSessionService.create(
                ctx.session.user.id,
                input.appointmentId
            );
            const wsAuthToken = createAuthToken(id);
            const patientJoinUrl = `${PUBLIC_URL}/consulta/entrar/${patientToken}`;
            return { sessionId: id, patientJoinUrl, wsAuthToken };
        }),

    get: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const s = await videoSessionService.getById(ctx.session.user.id, input.id);
            if (!s) throw new TRPCError({ code: "NOT_FOUND" });
            return { ...s, iceServers: await getIceServers() };
        }),

    end: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return videoSessionService.end(ctx.session.user.id, input.id);
        }),

    validateToken: publicProcedure
        .input(z.object({ token: z.string() }))
        .query(async ({ input }) => {
            const s = await videoSessionService.validateToken(input.token);
            if (!s) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Link inválido ou não encontrado.",
                });
            }
            if (s.status === "ended") {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Esta sessão já foi encerrada.",
                });
            }
            if (new Date() > new Date(s.expiresAt)) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Este link expirou.",
                });
            }
            return {
                sessionId: s.id,
                psychologistName: s.psychologistName,
                iceServers: await getIceServers(),
            };
        }),
});
