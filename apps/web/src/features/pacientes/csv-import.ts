import type { CsvField, CsvMappings } from "@/components/csv-import/types";
import type { RouterInputs } from "@/lib/trpc";
import { parseDate } from "@/utils/csv";

export const PATIENT_CSV_FIELDS = [
    { id: "nome", label: "Nome", required: true },
    { id: "email", label: "E-mail" },
    { id: "telefone", label: "Telefone" },
    { id: "dataNascimento", label: "Data de Nascimento" },
    { id: "cidade", label: "Cidade" },
    { id: "cpf", label: "CPF" },
    { id: "valorSessao", label: "Valor da Sessão" },
    { id: "modeloCobranca", label: "Modelo de Cobrança" },
    { id: "nomeSocial", label: "Nome Social" },
    { id: "rg", label: "RG" },
    { id: "profissao", label: "Profissão" },
    { id: "endereco", label: "Endereço" },
    { id: "cep", label: "CEP" },
    { id: "uf", label: "UF" },
    { id: "contatoEmergencia", label: "Contato de Emergência" },
    { id: "respLegalNome", label: "Resp. Legal - Nome" },
    { id: "respLegalParentesco", label: "Resp. Legal - Parentesco" },
    { id: "respLegalCpf", label: "Resp. Legal - CPF" },
    { id: "respLegalTelefone", label: "Resp. Legal - Telefone" },
    { id: "respLegalEmail", label: "Resp. Legal - E-mail" },
    { id: "servicoContratadoTipo", label: "Serviço Contratado" },
    { id: "dataInicioAcompanhamento", label: "Início do Acompanhamento" },
    { id: "formaPagamento", label: "Forma de Pagamento" },
    { id: "formaPagamentoDetalhe", label: "Detalhe Pagamento" },
    { id: "responsavelFinanceiroTipo", label: "Resp. Financeiro - Tipo" },
    { id: "responsavelFinanceiroDetalhe", label: "Resp. Financeiro - Detalhe" },
    { id: "origemContato", label: "Origem do Contato" },
    { id: "origemContatoDetalhe", label: "Detalhe Origem" },
] as const satisfies readonly CsvField[];

export type PatientCsvFieldId = (typeof PATIENT_CSV_FIELDS)[number]["id"];

type PatientImportRow = RouterInputs["patient"]["createMany"][number];

/** Linhas do CSV → payload de `patient.createMany`. Célula vazia vira null. */
export function mapCsvRowsToPatients(
    rows: string[][],
    mappings: CsvMappings<PatientCsvFieldId>
): PatientImportRow[] {
    const columnOf: Partial<Record<PatientCsvFieldId, number>> = {};
    for (const [column, fieldId] of Object.entries(mappings)) {
        if (fieldId !== "skip") columnOf[fieldId] = parseInt(column, 10);
    }
    const cell = (row: string[], field: PatientCsvFieldId): string | null => {
        const index = columnOf[field];
        if (index === undefined) return null;
        return String(row[index] ?? "").trim() || null;
    };
    const date = (row: string[], field: PatientCsvFieldId) => {
        const value = cell(row, field);
        return value ? parseDate(value) : null;
    };

    return rows
        .filter((row) => row.some((value) => value !== null && value !== ""))
        .map((row) => ({
            nome: cell(row, "nome") ?? "",
            email: cell(row, "email"),
            telefone: cell(row, "telefone"),
            dataNascimento: date(row, "dataNascimento"),
            cpf: cell(row, "cpf"),
            cidade: cell(row, "cidade"),
            valorSessao: cell(row, "valorSessao"),
            modeloCobranca: cell(row, "modeloCobranca"),
            nomeSocial: cell(row, "nomeSocial"),
            rg: cell(row, "rg"),
            profissao: cell(row, "profissao"),
            endereco: cell(row, "endereco"),
            cep: cell(row, "cep"),
            uf: cell(row, "uf"),
            contatoEmergencia: cell(row, "contatoEmergencia"),
            respLegalNome: cell(row, "respLegalNome"),
            respLegalParentesco: cell(row, "respLegalParentesco"),
            respLegalCpf: cell(row, "respLegalCpf"),
            respLegalTelefone: cell(row, "respLegalTelefone"),
            respLegalEmail: cell(row, "respLegalEmail"),
            servicoContratadoTipo: cell(row, "servicoContratadoTipo"),
            dataInicioAcompanhamento: date(row, "dataInicioAcompanhamento"),
            formaPagamento: cell(row, "formaPagamento"),
            formaPagamentoDetalhe: cell(row, "formaPagamentoDetalhe"),
            responsavelFinanceiroTipo: cell(row, "responsavelFinanceiroTipo"),
            responsavelFinanceiroDetalhe: cell(row, "responsavelFinanceiroDetalhe"),
            origemContato: cell(row, "origemContato"),
            origemContatoDetalhe: cell(row, "origemContatoDetalhe"),
        }));
}
