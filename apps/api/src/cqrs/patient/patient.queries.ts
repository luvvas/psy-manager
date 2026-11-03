import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { patient } from "../../db/schema";
import { decryptField } from "../../lib/encryption";

export function decryptPatientSummary<T extends { nome: string | null; email: string | null; telefone: string | null }>(row: T): T {
    return {
        ...row,
        nome: decryptField(row.nome),
        email: decryptField(row.email),
        telefone: decryptField(row.telefone),
    };
}

type PatientRow = typeof patient.$inferSelect;

function decryptPatient(row: PatientRow): Omit<PatientRow, "dataNascimento"> & { dataNascimento: Date | null } {
    const decryptedDate = decryptField(row.dataNascimento);
    return {
        ...row,
        nome: decryptField(row.nome),
        email: decryptField(row.email),
        telefone: decryptField(row.telefone),
        dataNascimento: decryptedDate ? new Date(decryptedDate) : null,
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
