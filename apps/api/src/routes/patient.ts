import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { patientCommands } from "../cqrs/patient/patient.commands";
import { patientQueries } from "../cqrs/patient/patient.queries";
import { TRPCError } from "@trpc/server";

export const patientRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        return patientQueries.list(ctx.session.user.id);
    }),

    getById: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const patient = await patientQueries.findById(ctx.session.user.id, input.id);
            if (!patient) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Paciente não encontrado",
                });
            }
            return patient;
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
                valorSessao: z.string().or(z.number()).optional().nullable(),
                modeloCobranca: z.string().optional().nullable(),
                // Extended Registration Fields
                nomeSocial: z.string().optional().nullable(),
                rg: z.string().optional().nullable(),
                profissao: z.string().optional().nullable(),
                endereco: z.string().optional().nullable(),
                cep: z.string().optional().nullable(),
                uf: z.string().optional().nullable(),
                contatoEmergencia: z.string().optional().nullable(),
                respLegalNome: z.string().optional().nullable(),
                respLegalParentesco: z.string().optional().nullable(),
                respLegalCpf: z.string().optional().nullable(),
                respLegalTelefone: z.string().optional().nullable(),
                respLegalEmail: z.string().optional().nullable(),
                servicoContratadoTipo: z.string().optional().nullable(),
                dataInicioAcompanhamento: z.string().or(z.date()).optional().nullable().transform((val) => val ? new Date(val) : null),
                formaPagamento: z.string().optional().nullable(),
                formaPagamentoDetalhe: z.string().optional().nullable(),
                responsavelFinanceiroTipo: z.string().optional().nullable(),
                responsavelFinanceiroDetalhe: z.string().optional().nullable(),
                origemContato: z.string().optional().nullable(),
                origemContatoDetalhe: z.string().optional().nullable(),
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
                valorSessao: z.string().or(z.number()).optional().nullable(),
                modeloCobranca: z.string().optional().nullable(),
                // Extended Registration Fields
                nomeSocial: z.string().optional().nullable(),
                rg: z.string().optional().nullable(),
                profissao: z.string().optional().nullable(),
                endereco: z.string().optional().nullable(),
                cep: z.string().optional().nullable(),
                uf: z.string().optional().nullable(),
                contatoEmergencia: z.string().optional().nullable(),
                respLegalNome: z.string().optional().nullable(),
                respLegalParentesco: z.string().optional().nullable(),
                respLegalCpf: z.string().optional().nullable(),
                respLegalTelefone: z.string().optional().nullable(),
                respLegalEmail: z.string().optional().nullable(),
                servicoContratadoTipo: z.string().optional().nullable(),
                dataInicioAcompanhamento: z.string().or(z.date()).optional().nullable().transform((val) => val ? new Date(val) : null),
                formaPagamento: z.string().optional().nullable(),
                formaPagamentoDetalhe: z.string().optional().nullable(),
                responsavelFinanceiroTipo: z.string().optional().nullable(),
                responsavelFinanceiroDetalhe: z.string().optional().nullable(),
                origemContato: z.string().optional().nullable(),
                origemContatoDetalhe: z.string().optional().nullable(),
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

    createMany: protectedProcedure
        .input(
            z.array(
                z.object({
                    nome: z.string().min(1),
                    email: z.string().email(),
                    telefone: z.string().min(1),
                    dataNascimento: z.string().or(z.date()).transform((val) => new Date(val)),
                    cidade: z.string().min(1),
                    cpf: z.string().min(1),
                    valorSessao: z.string().or(z.number()).optional().nullable(),
                    modeloCobranca: z.string().optional().nullable(),
                    nomeSocial: z.string().optional().nullable(),
                    rg: z.string().optional().nullable(),
                    profissao: z.string().optional().nullable(),
                    endereco: z.string().optional().nullable(),
                    cep: z.string().optional().nullable(),
                    uf: z.string().optional().nullable(),
                    contatoEmergencia: z.string().optional().nullable(),
                    respLegalNome: z.string().optional().nullable(),
                    respLegalParentesco: z.string().optional().nullable(),
                    respLegalCpf: z.string().optional().nullable(),
                    respLegalTelefone: z.string().optional().nullable(),
                    respLegalEmail: z.string().optional().nullable(),
                    servicoContratadoTipo: z.string().optional().nullable(),
                    dataInicioAcompanhamento: z.string().or(z.date()).optional().nullable().transform((val) => val ? new Date(val) : null),
                    formaPagamento: z.string().optional().nullable(),
                    formaPagamentoDetalhe: z.string().optional().nullable(),
                    responsavelFinanceiroTipo: z.string().optional().nullable(),
                    responsavelFinanceiroDetalhe: z.string().optional().nullable(),
                    origemContato: z.string().optional().nullable(),
                    origemContatoDetalhe: z.string().optional().nullable(),
                })
            )
        )
        .mutation(async ({ ctx, input }) => {
            await Promise.all(
                input.map((patient) =>
                    patientCommands.create({
                        ...patient,
                        psychologistId: ctx.session.user.id,
                    })
                )
            );
            return { count: input.length };
        }),
});
