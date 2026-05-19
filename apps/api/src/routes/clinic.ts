import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/index";
import { clinicService } from "../services/clinic.service";

export const clinicRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        return clinicService.list(ctx.session.user.id);
    }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1),
                cnpj: z.string().min(1),
                phone: z.string().min(1),
                email: z.string().email(),
                address: z.string().min(1),
                city: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return clinicService.create(ctx.session.user.id, input);
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
                name: z.string().min(1),
                cnpj: z.string().min(1),
                phone: z.string().min(1),
                email: z.string().email(),
                address: z.string().min(1),
                city: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const result = await clinicService.update(ctx.session.user.id, id, data);
            if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Clínica não encontrada." });
            return result;
        }),

    delete: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const result = await clinicService.delete(ctx.session.user.id, input.id);
            if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Clínica não encontrada." });
            return result;
        }),

    linkPsychologist: protectedProcedure
        .input(
            z.object({
                clinicId: z.string().min(1),
                psychologistEmail: z.string().email(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                return await clinicService.linkPsychologist(ctx.session.user.id, input.clinicId, input.psychologistEmail);
            } catch (err: any) {
                throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
            }
        }),

    unlinkPsychologist: protectedProcedure
        .input(
            z.object({
                clinicId: z.string().min(1),
                psychologistId: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                return await clinicService.unlinkPsychologist(ctx.session.user.id, input.clinicId, input.psychologistId);
            } catch (err: any) {
                throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
            }
        }),
});
