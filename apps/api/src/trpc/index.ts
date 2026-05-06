import { initTRPC } from "@trpc/server";
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
