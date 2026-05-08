import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

/**
 * tRPC initialization.
 * SuperJSON transformer handles Date, Map, Set serialization automatically.
 */
const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

/**
 * Export reusable building blocks
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * Protected procedure — requires an authenticated session.
 * Throws UNAUTHORIZED if no session is present.
 */
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
