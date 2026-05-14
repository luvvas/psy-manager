import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { clinicalRecordService } from "../services/clinical-record.service";
import { TRPCError } from "@trpc/server";
import { storageService } from "../services/storage.service";

export const clinicalRecordRouter = router({
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
            const record = await clinicalRecordService.getById(ctx.session.user.id, input.id);
            if (!record) return null;

            if (record.storageKey) {
                return { url: await storageService.createReadUrl(record.storageKey) };
            }

            return { url: record.fileUrl };
        }),

    list: protectedProcedure
        .input(
            z.object({
                patientId: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            return clinicalRecordService.list(ctx.session.user.id, input);
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            return clinicalRecordService.getById(ctx.session.user.id, input.id);
        }),

    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(1),
                patientId: z.string().min(1),
                category: z.string().optional(),
                textContent: z.string().optional(),
                fileUrl: z.string().optional(),
                storageKey: z.string().optional(),
                fileName: z.string().optional(),
                mimeType: z.string().optional(),
                fileSize: z.number().int().positive().optional(),
                dateOfService: z.date().optional(),
                appointmentId: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return clinicalRecordService.create(ctx.session.user.id, input);
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
                title: z.string().optional(),
                category: z.string().optional(),
                textContent: z.string().optional(),
                fileUrl: z.string().optional(),
                storageKey: z.string().optional(),
                fileName: z.string().optional(),
                mimeType: z.string().optional(),
                fileSize: z.number().int().positive().optional(),
                dateOfService: z.date().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            try {
                return await clinicalRecordService.update(ctx.session.user.id, id, data);
            } catch (err: any) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: err.message,
                });
            }
        }),

    finalize: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            try {
                return await clinicalRecordService.finalize(ctx.session.user.id, input.id);
            } catch (err: any) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: err.message,
                });
            }
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            try {
                return await clinicalRecordService.delete(ctx.session.user.id, input.id);
            } catch (err: any) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: err.message,
                });
            }
        }),
});
