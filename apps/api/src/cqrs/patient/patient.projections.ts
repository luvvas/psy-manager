import { eq } from "drizzle-orm";
import { db } from "../../db";
import { patient } from "../../db/schema";
import { eventBus } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";
import { encrypt, encryptField } from "../../lib/encryption";

export const patientProjections = {
    init() {
        eventBus.subscribe("PATIENT_CREATED", this.handlePatientCreated);
        eventBus.subscribe("PATIENT_UPDATED", this.handlePatientUpdated);
        eventBus.subscribe("PATIENT_DELETED", this.handlePatientDeleted);
        console.log("📈 Patient Projections subscribed to EventBus");
    },

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
            nome: encrypt(nome),
            email: encryptField(email || null),
            telefone: encryptField(telefone || null),
            dataNascimento: dataNascimento ? encrypt(new Date(dataNascimento).toISOString()) : null,
            cidade: cidade || null,
            cpf: encryptField(cpf || null),
            psychologistId,
            valorSessao: valorSessao ? String(valorSessao) : null,
            modeloCobranca,
            nomeSocial: encryptField(nomeSocial),
            rg: encryptField(rg),
            profissao: encryptField(profissao),
            endereco: encryptField(endereco),
            cep: encryptField(cep),
            uf,
            contatoEmergencia: encryptField(contatoEmergencia),
            respLegalNome: encryptField(respLegalNome),
            respLegalParentesco,
            respLegalCpf: encryptField(respLegalCpf),
            respLegalTelefone: encryptField(respLegalTelefone),
            respLegalEmail: encryptField(respLegalEmail),
            servicoContratadoTipo,
            dataInicioAcompanhamento: dataInicioAcompanhamento ? new Date(dataInicioAcompanhamento) : null,
            formaPagamento: encryptField(formaPagamento),
            formaPagamentoDetalhe: encryptField(formaPagamentoDetalhe),
            responsavelFinanceiroTipo,
            responsavelFinanceiroDetalhe: encryptField(responsavelFinanceiroDetalhe),
            origemContato,
            origemContatoDetalhe,
            createdAt: event.createdAt ?? new Date(),
            updatedAt: event.createdAt ?? new Date(),
        }).onConflictDoNothing();
        
        console.log(`📈 Read Model Projected: Patient Created -> (${id})`);
    },

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
                nome: encrypt(nome),
                email: encryptField(email || null),
                telefone: encryptField(telefone || null),
                dataNascimento: dataNascimento ? encrypt(new Date(dataNascimento).toISOString()) : null,
                cidade: cidade || null,
                cpf: encryptField(cpf || null),
                valorSessao: valorSessao ? String(valorSessao) : null,
                modeloCobranca,
                nomeSocial: encryptField(nomeSocial),
                rg: encryptField(rg),
                profissao: encryptField(profissao),
                endereco: encryptField(endereco),
                cep: encryptField(cep),
                uf,
                contatoEmergencia: encryptField(contatoEmergencia),
                respLegalNome: encryptField(respLegalNome),
                respLegalParentesco,
                respLegalCpf: encryptField(respLegalCpf),
                respLegalTelefone: encryptField(respLegalTelefone),
                respLegalEmail: encryptField(respLegalEmail),
                servicoContratadoTipo,
                dataInicioAcompanhamento: dataInicioAcompanhamento ? new Date(dataInicioAcompanhamento) : null,
                formaPagamento: encryptField(formaPagamento),
                formaPagamentoDetalhe: encryptField(formaPagamentoDetalhe),
                responsavelFinanceiroTipo,
                responsavelFinanceiroDetalhe: encryptField(responsavelFinanceiroDetalhe),
                origemContato,
                origemContatoDetalhe,
                updatedAt: event.createdAt ?? new Date(),
            })
            .where(eq(patient.id, id));

        console.log(`📈 Read Model Projected: Patient Updated -> (${id})`);
    },

    async handlePatientDeleted(event: DomainEvent): Promise<void> {
        const id = event.aggregateId;

        await db.delete(patient).where(eq(patient.id, id));

        console.log(`📈 Read Model Projected: Patient Deleted -> (${id})`);
    },
};
