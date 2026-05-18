import { z } from "zod";
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
            return clinicService.update(ctx.session.user.id, id, data);
        }),

    delete: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return clinicService.delete(ctx.session.user.id, input.id);
        }),

    linkPsychologist: protectedProcedure
        .input(
            z.object({
                clinicId: z.string().min(1),
                psychologistEmail: z.string().email(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return clinicService.linkPsychologist(ctx.session.user.id, input.clinicId, input.psychologistEmail);
        }),

    unlinkPsychologist: protectedProcedure
        .input(
            z.object({
                clinicId: z.string().min(1),
                psychologistId: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return clinicService.unlinkPsychologist(ctx.session.user.id, input.clinicId, input.psychologistId);
        }),
});
