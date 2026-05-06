import { z } from "zod";
import { router, publicProcedure } from "./index";
import { users } from "../db/schema";

/**
 * Root application router.
 * All sub-routers are merged here.
 */
export const appRouter = router({
  // Health check
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date() };
  }),

  // Example: User routes
  user: router({
    list: publicProcedure.query(async ({ ctx }) => {
      return ctx.db.select().from(users);
    }),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const [user] = await ctx.db
          .insert(users)
          .values({
            name: input.name,
            email: input.email,
          })
          .returning();
        return user;
      }),
  }),
});

// Export type for client consumption (apps/web)
export type AppRouter = typeof appRouter;
