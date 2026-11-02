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

    addRoom: protectedProcedure
        .input(z.object({ clinicId: z.string().min(1), name: z.string().trim().min(1).max(60) }))
        .mutation(async ({ ctx, input }) => {
            const room = await clinicService.addRoom(ctx.session.user.id, input.clinicId, input.name);
            if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Clínica não encontrada." });
            return room;
        }),

    renameRoom: protectedProcedure
        .input(z.object({ roomId: z.string().min(1), name: z.string().trim().min(1).max(60) }))
        .mutation(async ({ ctx, input }) => {
            const room = await clinicService.renameRoom(ctx.session.user.id, input.roomId, input.name);
            if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Sala não encontrada." });
            return room;
        }),

    removeRoom: protectedProcedure
        .input(z.object({ roomId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const result = await clinicService.archiveRoom(ctx.session.user.id, input.roomId);
            if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Sala não encontrada." });
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

    listInvites: protectedProcedure.query(async ({ ctx }) => {
        return clinicService.listInvites(ctx.session.user.id);
    }),

    acceptInvite: protectedProcedure
        .input(z.object({ clinicId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const result = await clinicService.acceptInvite(ctx.session.user.id, input.clinicId);
            if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
            return { success: true };
        }),

    declineInvite: protectedProcedure
        .input(z.object({ clinicId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const result = await clinicService.declineInvite(ctx.session.user.id, input.clinicId);
            if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
            return { success: true };
        }),

    leave: protectedProcedure
        .input(z.object({ clinicId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            let result;
            try {
                result = await clinicService.leave(ctx.session.user.id, input.clinicId);
            } catch (err: any) {
                throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
            }
            if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Clínica não encontrada." });
            return { success: true };
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
