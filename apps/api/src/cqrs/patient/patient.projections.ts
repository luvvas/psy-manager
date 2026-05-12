import { eq } from "drizzle-orm";
import { db } from "../../db";
import { patient } from "../../db/schema";
import { eventBus } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";

/**
 * Patient Projections (updates the Read Model optimized for fast querying)
 */
export const patientProjections = {
    /**
     * Initializes projection event subscriptions.
     * Call this during API bootstrap/startup.
     */
    init() {
        // Subscribe to events to update the SQL projection in real-time
        eventBus.subscribe("PATIENT_CREATED", this.handlePatientCreated);
        eventBus.subscribe("PATIENT_UPDATED", this.handlePatientUpdated);
        eventBus.subscribe("PATIENT_DELETED", this.handlePatientDeleted);
        console.log("📈 Patient Projections subscribed to EventBus");
    },

    /**
     * Handles PATIENT_CREATED event: Inserts a new record into the read-model table.
     */
    async handlePatientCreated(event: DomainEvent): Promise<void> {
        const { 
            id, nome, email, telefone, dataNascimento, cidade, cpf, psychologistId, valorSessao, modeloCobranca,
            nomeSocial, rg, profissao, endereco, cep, uf, contatoEmergencia,
            respLegalNome, respLegalParentesco, respLegalCpf, respLegalTelefone, respLegalEmail,
            servicoContratadoTipo, dataInicioAcompanhamento, formaPagamento, formaPagamentoDetalhe,
            responsavelFinanceiroTipo, responsavelFinanceiroDetalhe, origemContato, origemContatoDetalhe 
        } = event.data;
        
        await db.insert(patient).values({
            id,
            nome,
            email,
            telefone,
            dataNascimento: new Date(dataNascimento),
            cidade,
            cpf,
            psychologistId,
            valorSessao: valorSessao ? String(valorSessao) : null,
            modeloCobranca,
            // Projections for extended survey fields
            nomeSocial, rg, profissao, endereco, cep, uf, contatoEmergencia,
            respLegalNome, respLegalParentesco, respLegalCpf, respLegalTelefone, respLegalEmail,
            servicoContratadoTipo,
            dataInicioAcompanhamento: dataInicioAcompanhamento ? new Date(dataInicioAcompanhamento) : null,
            formaPagamento, formaPagamentoDetalhe,
            responsavelFinanceiroTipo, responsavelFinanceiroDetalhe,
            origemContato, origemContatoDetalhe,
            createdAt: event.createdAt ?? new Date(),
            updatedAt: event.createdAt ?? new Date(),
        });
        
        console.log(`📈 Read Model Projected: Patient Created -> ${nome} (${id})`);
    },

    /**
     * Handles PATIENT_UPDATED event: Updates an existing record in the read-model table.
     */
    async handlePatientUpdated(event: DomainEvent): Promise<void> {
        const { 
            nome, email, telefone, dataNascimento, cidade, cpf, valorSessao, modeloCobranca,
            nomeSocial, rg, profissao, endereco, cep, uf, contatoEmergencia,
            respLegalNome, respLegalParentesco, respLegalCpf, respLegalTelefone, respLegalEmail,
            servicoContratadoTipo, dataInicioAcompanhamento, formaPagamento, formaPagamentoDetalhe,
            responsavelFinanceiroTipo, responsavelFinanceiroDetalhe, origemContato, origemContatoDetalhe 
        } = event.data;
        const id = event.aggregateId;

        await db
            .update(patient)
            .set({
                nome,
                email,
                telefone,
                dataNascimento: new Date(dataNascimento),
                cidade,
                cpf,
                valorSessao: valorSessao ? String(valorSessao) : null,
                modeloCobranca,
                // Projection update for extended survey fields
                nomeSocial, rg, profissao, endereco, cep, uf, contatoEmergencia,
                respLegalNome, respLegalParentesco, respLegalCpf, respLegalTelefone, respLegalEmail,
                servicoContratadoTipo,
                dataInicioAcompanhamento: dataInicioAcompanhamento ? new Date(dataInicioAcompanhamento) : null,
                formaPagamento, formaPagamentoDetalhe,
                responsavelFinanceiroTipo, responsavelFinanceiroDetalhe,
                origemContato, origemContatoDetalhe,
                updatedAt: event.createdAt ?? new Date(),
            })
            .where(eq(patient.id, id));

        console.log(`📈 Read Model Projected: Patient Updated -> ${nome} (${id})`);
    },

    /**
     * Handles PATIENT_DELETED event: Deletes (or marks as deleted) the record in the read-model table.
     * In this project, we delete the row from the projection since the event store has the full history anyway.
     */
    async handlePatientDeleted(event: DomainEvent): Promise<void> {
        const id = event.aggregateId;

        await db.delete(patient).where(eq(patient.id, id));

        console.log(`📈 Read Model Projected: Patient Deleted -> (${id})`);
    },
};
