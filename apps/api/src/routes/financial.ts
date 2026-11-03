import { TRANSACTION_STATUSES, TRANSACTION_TYPES } from "../db/schema";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { financialService } from "../services/financial.service";
import { assertPatientOwnership } from "../lib/ownership";

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
                type: z.enum(TRANSACTION_TYPES),
                description: z.string().min(1),
                amount: z.string().or(z.number()),
                date: z.string().or(z.date()).transform((v) => new Date(v)),
                category: z.string().optional().nullable(),
                patientId: z.string().optional().nullable(),
                status: z.enum(TRANSACTION_STATUSES).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (input.patientId) await assertPatientOwnership(input.patientId, ctx.session.user.id);
            return financialService.create(ctx.session.user.id, input);
        }),

    createMany: protectedProcedure
        .input(
            z.array(
                z.object({
                    type: z.enum(TRANSACTION_TYPES),
                    description: z.string().min(1),
                    amount: z.string().or(z.number()),
                    date: z.string().or(z.date()).transform((v) => new Date(v)),
                    category: z.string().optional().nullable(),
                    status: z.enum(TRANSACTION_STATUSES).optional(),
                })
            )
        )
        .mutation(async ({ ctx, input }) => {
            return financialService.createMany(ctx.session.user.id, input);
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
                type: z.enum(TRANSACTION_TYPES).optional(),
                description: z.string().min(1).optional(),
                amount: z.string().or(z.number()).optional(),
                date: z.string().or(z.date()).transform((v) => v ? new Date(v) : undefined).optional(),
                category: z.string().optional().nullable(),
                patientId: z.string().optional().nullable(),
                status: z.enum(TRANSACTION_STATUSES).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, type, description, amount, date, category, patientId, status } = input;
            if (patientId) await assertPatientOwnership(patientId, ctx.session.user.id);
            return financialService.update(ctx.session.user.id, id, {
                type, description, amount, date, category, patientId, status,
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return financialService.delete(ctx.session.user.id, input.id);
        }),
});
