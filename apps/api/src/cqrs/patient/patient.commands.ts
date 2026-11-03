import { cqrsEventStore, eventBus } from "../../lib/cqrs";
import { PatientAggregate } from "./patient.aggregate";
import { TRPCError } from "@trpc/server";

const notFound = () => new TRPCError({ code: "NOT_FOUND", message: "Paciente não encontrado." });

export interface CreatePatientCommand {
    nome: string;
    email?: string | null;
    telefone?: string | null;
    dataNascimento?: Date | null;
    cidade?: string | null;
    cpf?: string | null;
    psychologistId: string;
    valorSessao?: number | string | null;
    modeloCobranca?: string | null;
    nomeSocial?: string | null;
    rg?: string | null;
    profissao?: string | null;
    endereco?: string | null;
    cep?: string | null;
    uf?: string | null;
    contatoEmergencia?: string | null;
    respLegalNome?: string | null;
    respLegalParentesco?: string | null;
    respLegalCpf?: string | null;
    respLegalTelefone?: string | null;
    respLegalEmail?: string | null;
    servicoContratadoTipo?: string | null;
    dataInicioAcompanhamento?: Date | null;
    formaPagamento?: string | null;
    formaPagamentoDetalhe?: string | null;
    responsavelFinanceiroTipo?: string | null;
    responsavelFinanceiroDetalhe?: string | null;
    origemContato?: string | null;
    origemContatoDetalhe?: string | null;
}

export interface UpdatePatientCommand {
    id: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    dataNascimento?: Date | null;
    cidade?: string | null;
    cpf?: string | null;
    psychologistId: string;
    valorSessao?: number | string | null;
    modeloCobranca?: string | null;
    nomeSocial?: string | null;
    rg?: string | null;
    profissao?: string | null;
    endereco?: string | null;
    cep?: string | null;
    uf?: string | null;
    contatoEmergencia?: string | null;
    respLegalNome?: string | null;
    respLegalParentesco?: string | null;
    respLegalCpf?: string | null;
    respLegalTelefone?: string | null;
    respLegalEmail?: string | null;
    servicoContratadoTipo?: string | null;
    dataInicioAcompanhamento?: Date | null;
    formaPagamento?: string | null;
    formaPagamentoDetalhe?: string | null;
    responsavelFinanceiroTipo?: string | null;
    responsavelFinanceiroDetalhe?: string | null;
    origemContato?: string | null;
    origemContatoDetalhe?: string | null;
}

export interface DeletePatientCommand {
    id: string;
    psychologistId: string;
}

export const patientCommands = {
    async create(command: CreatePatientCommand): Promise<string> {
        const id = crypto.randomUUID();
        const aggregate = new PatientAggregate();

        aggregate.create({
            id,
            ...command,
        });

        await cqrsEventStore.saveEvents(id, 0, aggregate.uncommittedEvents);

        await eventBus.publishAll(aggregate.uncommittedEvents);

        aggregate.clearUncommittedEvents();

        return id;
    },

    async update(command: UpdatePatientCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw notFound();
        }

        const aggregate = new PatientAggregate();
        
        aggregate.loadFromHistory(history);

        if (aggregate.state.psychologistId !== command.psychologistId) {
            throw notFound();
        }

        const expectedVersion = aggregate.version;

        aggregate.update({
            ...command,
        });

        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);

        await eventBus.publishAll(aggregate.uncommittedEvents);

        aggregate.clearUncommittedEvents();
    },

    async delete(command: DeletePatientCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw notFound();
        }

        const aggregate = new PatientAggregate();
        aggregate.loadFromHistory(history);

        if (aggregate.state.psychologistId !== command.psychologistId) {
            throw notFound();
        }

        const expectedVersion = aggregate.version;

        aggregate.delete();

        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },
};
