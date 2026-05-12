import { cqrsEventStore, eventBus } from "../../lib/cqrs";
import { PatientAggregate } from "./patient.aggregate";

export interface CreatePatientCommand {
    nome: string;
    email: string;
    telefone: string;
    dataNascimento: Date;
    cidade: string;
    cpf: string;
    psychologistId: string;
    valorSessao?: number | string | null;
    modeloCobranca?: string | null;
    // New optional fields passed in
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
    email: string;
    telefone: string;
    dataNascimento: Date;
    cidade: string;
    cpf: string;
    psychologistId: string;
    valorSessao?: number | string | null;
    modeloCobranca?: string | null;
    // New optional fields updated
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
    /**
     * Handles creating a new patient by initializing the aggregate and saving its creation event.
     */
    async create(command: CreatePatientCommand): Promise<string> {
        const id = crypto.randomUUID();
        const aggregate = new PatientAggregate();

        // 1. Apply command business logic inside the Aggregate Root
        aggregate.create({
            id,
            ...command,
        });

        // 2. Save raised events to the Event Store (expected version is 0 for new aggregate)
        await cqrsEventStore.saveEvents(id, 0, aggregate.uncommittedEvents);

        // 3. Dispatch events to the Event Bus (to update Read Projections)
        await eventBus.publishAll(aggregate.uncommittedEvents);

        // 4. Clear uncommitted events
        aggregate.clearUncommittedEvents();

        return id;
    },

    /**
     * Handles updating an existing patient by replaying history, applying the update, and saving events.
     */
    async update(command: UpdatePatientCommand): Promise<void> {
        // 1. Load historical events from the Event Store
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw new Error(`Patient with ID ${command.id} not found`);
        }

        const aggregate = new PatientAggregate();
        
        // 2. Replay history to reconstruct current state
        aggregate.loadFromHistory(history);

        // Authorization check: Ensure psychologist owns this aggregate
        if (aggregate.state.psychologistId !== command.psychologistId) {
            throw new Error("Unauthorized: You do not own this patient record");
        }

        const expectedVersion = aggregate.version;

        // 3. Apply the update command
        aggregate.update({
            ...command,
        });

        // 4. Save events with optimistic concurrency check
        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);

        // 5. Dispatch events to trigger projections
        await eventBus.publishAll(aggregate.uncommittedEvents);

        aggregate.clearUncommittedEvents();
    },

    /**
     * Handles deleting a patient aggregate.
     */
    async delete(command: DeletePatientCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw new Error(`Patient with ID ${command.id} not found`);
        }

        const aggregate = new PatientAggregate();
        aggregate.loadFromHistory(history);

        if (aggregate.state.psychologistId !== command.psychologistId) {
            throw new Error("Unauthorized: You do not own this patient record");
        }

        const expectedVersion = aggregate.version;

        aggregate.delete();

        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },
};
