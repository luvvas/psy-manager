import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { patient } from "../../db/schema";
import { decryptField } from "../../lib/encryption";

/**
 * Patient Queries (Read-only side of CQRS)
 * Queries read directly from the high-performance relational Projection tables (not replaying events),
 * fulfilling the main performance benefit of CQRS.
 */

/**
 * Decrypts the subset of patient fields that appear in join-query selections
 * (nome, email, telefone). Use this in any query that joins with the patient
 * table and selects only a summary — so encrypted fields are never forgotten.
 */
export function decryptPatientSummary<T extends { nome: string | null; email: string | null; telefone: string | null }>(row: T): T {
    return {
        ...row,
        nome: decryptField(row.nome),
        email: decryptField(row.email),
        telefone: decryptField(row.telefone),
    };
}

function decryptPatient<T extends Record<string, any>>(row: T): T {
    const decryptedDate = decryptField(row.dataNascimento as string);
    return {
        ...row,
        nome: decryptField(row.nome),
        email: decryptField(row.email),
        telefone: decryptField(row.telefone),
        dataNascimento: (decryptedDate ? new Date(decryptedDate) : row.dataNascimento) as T[keyof T],
        cpf: decryptField(row.cpf),
        rg: decryptField(row.rg),
        nomeSocial: decryptField(row.nomeSocial),
        profissao: decryptField(row.profissao),
        endereco: decryptField(row.endereco),
        cep: decryptField(row.cep),
        contatoEmergencia: decryptField(row.contatoEmergencia),
        respLegalNome: decryptField(row.respLegalNome),
        respLegalCpf: decryptField(row.respLegalCpf),
        respLegalTelefone: decryptField(row.respLegalTelefone),
        respLegalEmail: decryptField(row.respLegalEmail),
        formaPagamento: decryptField(row.formaPagamento),
        formaPagamentoDetalhe: decryptField(row.formaPagamentoDetalhe),
        responsavelFinanceiroDetalhe: decryptField(row.responsavelFinanceiroDetalhe),
    };
}

export const patientQueries = {
    async list(psychologistId: string) {
        const rows = await db
            .select()
            .from(patient)
            .where(eq(patient.psychologistId, psychologistId));
        return rows.map(decryptPatient);
    },

    async findById(psychologistId: string, id: string) {
        const [result] = await db
            .select()
            .from(patient)
            .where(
                and(
                    eq(patient.id, id),
                    eq(patient.psychologistId, psychologistId)
                )
            );
        return result ? decryptPatient(result) : null;
    },
};
