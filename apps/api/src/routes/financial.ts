import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { financialService } from "../services/financial.service";

export const financialRouter = router({
    list: protectedProcedure
        .input(
            z.object({
                startDate: z.string().or(z.date()).optional().transform((v) => v ? new Date(v) : undefined),
                endDate: z.string().or(z.date()).optional().transform((v) => v ? new Date(v) : undefined),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            return financialService.list(ctx.session.user.id, input || {});
        }),

    create: protectedProcedure
        .input(
            z.object({
                type: z.enum(["income", "expense"]),
                description: z.string().min(1),
                amount: z.string().or(z.number()),
                date: z.string().or(z.date()).transform((v) => new Date(v)),
                category: z.string().optional().nullable(),
                patientId: z.string().optional().nullable(),
                status: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return financialService.create(ctx.session.user.id, input);
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
                type: z.enum(["income", "expense"]).optional(),
                description: z.string().min(1).optional(),
                amount: z.string().or(z.number()).optional(),
                date: z.string().or(z.date()).transform((v) => v ? new Date(v) : undefined).optional(),
                category: z.string().optional().nullable(),
                patientId: z.string().optional().nullable(),
                status: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            return financialService.update(ctx.session.user.id, id, data as any);
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return financialService.delete(ctx.session.user.id, input.id);
        }),
});
