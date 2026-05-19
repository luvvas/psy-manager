import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/index";
import { documentService } from "../services/document.service";
import { storageService } from "../services/storage.service";

export const documentRouter = router({
    prepareUpload: protectedProcedure
        .input(
            z.object({
                fileName: z.string().min(1),
                contentType: z.literal("application/pdf"),
                fileSize: z.number().int().positive().max(10 * 1024 * 1024),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return storageService.createUploadTarget(ctx.session.user.id, input);
        }),

    getDownloadUrl: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const doc = await documentService.getById(ctx.session.user.id, input.id);
            if (!doc) return null;

            if (doc.storageKey) {
                return { url: await storageService.createReadUrl(doc.storageKey, ctx.session.user.id) };
            }

            return { url: doc.content };
        }),

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
                storageKey: z.string().optional(),
                fileName: z.string().optional(),
                mimeType: z.string().optional(),
                fileSize: z.number().int().positive().optional(),
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
                storageKey: z.string().optional(),
                fileName: z.string().optional(),
                mimeType: z.string().optional(),
                fileSize: z.number().int().positive().optional(),
                type: z.string().optional(),
                category: z.string().optional(),
                isTemplate: z.boolean().optional(),
                patientId: z.string().optional().nullable(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            try {
                return await documentService.update(ctx.session.user.id, id, {
                    ...data,
                    patientId: data.patientId ?? undefined,
                });
            } catch (err: any) {
                throw new TRPCError({ code: "NOT_FOUND", message: err.message });
            }
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            try {
                return await documentService.delete(ctx.session.user.id, input.id);
            } catch (err: any) {
                throw new TRPCError({ code: "NOT_FOUND", message: err.message });
            }
        }),
});
