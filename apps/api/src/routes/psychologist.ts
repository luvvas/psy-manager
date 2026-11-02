import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { psychologistService } from "../services/psychologist.service";
import { workScheduleSchema } from "../lib/work-schedule";

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
                    tableHeader: z.string().optional(),
                }).optional().nullable(),
                workSchedule: workScheduleSchema.optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return psychologistService.updateProfile(ctx.session.user.id, input);
        }),

    exportData: protectedProcedure.query(async ({ ctx }) => {
        return psychologistService.exportData(ctx.session.user.id);
    }),

    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
        await psychologistService.deleteAccount(ctx.session.user.id);
        return { success: true };
    }),
});
