import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../trpc/index";
import { videoSessionService } from "../services/video-session.service";
import { createAuthToken } from "../ws/rooms";

const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:5173";
const TURN_URL = process.env.TURN_URL;
const TURN_USERNAME = process.env.TURN_USERNAME;
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL;

type IceServer = { urls: string; username?: string; credential?: string };

function getIceServers(): IceServer[] {
    const servers: IceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
    if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
        servers.push({ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL });
    }
    return servers;
}

export const videoSessionRouter = router({
    create: protectedProcedure
        .input(z.object({ appointmentId: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
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
            return { ...s, iceServers: getIceServers() };
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
                iceServers: getIceServers(),
            };
        }),
});
