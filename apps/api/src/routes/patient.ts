import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { patientCommands } from "../cqrs/patient/patient.commands";
import { patientQueries } from "../cqrs/patient/patient.queries";

export const patientRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        // Query side of CQRS: reads from projection table
        return patientQueries.list(ctx.session.user.id);
    }),

    create: protectedProcedure
        .input(
            z.object({
                nome: z.string().min(1),
                email: z.string().email(),
                telefone: z.string().min(1),
                dataNascimento: z.string().or(z.date()).transform((val) => new Date(val)),
                cidade: z.string().min(1),
                cpf: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Command side of CQRS: dispatches creation command to generate events
            const patientId = await patientCommands.create({
                ...input,
                psychologistId: ctx.session.user.id,
            });
            return { id: patientId, success: true };
        }),

    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                nome: z.string().min(1),
                email: z.string().email(),
                telefone: z.string().min(1),
                dataNascimento: z.string().or(z.date()).transform((val) => new Date(val)),
                cidade: z.string().min(1),
                cpf: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Command side of CQRS: replays history and appends update event
            await patientCommands.update({
                ...input,
                psychologistId: ctx.session.user.id,
            });
            return { success: true };
        }),

    delete: protectedProcedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Command side of CQRS: replays history and appends deletion event
            await patientCommands.delete({
                id: input.id,
                psychologistId: ctx.session.user.id,
            });
            return { success: true };
        }),
});
