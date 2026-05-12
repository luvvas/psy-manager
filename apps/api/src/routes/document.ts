import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { documentService } from "../services/document.service";

export const documentRouter = router({
    list: protectedProcedure
        .input(
            z.object({
                patientId: z.string().optional(),
                isTemplate: z.boolean().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            return documentService.list(ctx.session.user.id, input);
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            return documentService.getById(ctx.session.user.id, input.id);
        }),

    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1),
                content: z.string().optional(),
                type: z.string().optional(),
                category: z.string().optional(),
                isTemplate: z.boolean().optional(),
                patientId: z.string().optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return documentService.create(ctx.session.user.id, {
                ...input,
                patientId: input.patientId ?? undefined
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
                title: z.string().optional(),
                content: z.string().optional(),
                type: z.string().optional(),
                category: z.string().optional(),
                isTemplate: z.boolean().optional(),
                patientId: z.string().optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            return documentService.update(ctx.session.user.id, id, {
                ...data,
                patientId: data.patientId ?? undefined
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return documentService.delete(ctx.session.user.id, input.id);
        }),
});
