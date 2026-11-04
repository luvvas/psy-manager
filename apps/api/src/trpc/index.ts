import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";
import { featureFlagService, type FeatureFlagKey } from "../services/feature-flag.service";

const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.session) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Você precisa estar autenticado para acessar este recurso.",
        });
    }
    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
        },
    });
});

export const flaggedProcedure = (key: FeatureFlagKey) =>
    protectedProcedure.use(async ({ ctx, next }) => {
        if (!(await featureFlagService.isEnabled(key, ctx.session.user.id))) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Este recurso ainda não está disponível para a sua conta.",
            });
        }
        return next();
    });
