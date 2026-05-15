import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc/index";
import { psychologistService } from "../services/psychologist.service";

export const psychologistRouter = router({
    me: protectedProcedure.query(async ({ ctx }) => {
        return psychologistService.getById(ctx.session.user.id);
    }),

    updateProfile: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1).optional(),
                phone: z.string().optional(),
                crp: z.string().optional(),
                city: z.string().optional(),
                themeConfig: z.object({
                    primary: z.string().optional(),
                    sidebar: z.string().optional(),
                    button: z.string().optional(),
                }).optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return psychologistService.updateProfile(ctx.session.user.id, input);
        }),

    list: publicProcedure.query(async () => {
        return psychologistService.list();
    }),
});
