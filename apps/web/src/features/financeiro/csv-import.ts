import * as z from "zod/v3";
import type { CsvField, CsvMappings } from "@/components/csv-import/types";
import { parseCurrency, parseDate, parseStatus } from "@/utils/csv";

export const TRANSACTION_CSV_FIELDS = [
    { id: "date", label: "Data", required: true },
    { id: "description", label: "Descrição", required: true },
    { id: "category", label: "Categoria", required: true },
    { id: "status", label: "Situação", required: true },
    { id: "amount", label: "Valor", required: true },
] as const satisfies readonly CsvField[];

export type TransactionCsvFieldId = (typeof TRANSACTION_CSV_FIELDS)[number]["id"];

export const transactionRowSchema = z.object({
    date: z.date(),
    description: z.string().min(1),
    category: z.string(),
    amount: z.number().nonnegative(),
    type: z.enum(["income", "expense"]),
    status: z.enum(["paid", "pending"]),
});

export type TransactionRow = z.infer<typeof transactionRowSchema>;

/**
 * Linhas do CSV → transações validadas, segundo o mapeamento escolhido. Valor negativo
 * vira despesa. Lança erro se alguma linha for inválida (a mensagem cita a linha do
 * arquivo quando o problema é a data).
 */
export function mapCsvRowsToTransactions(
    rows: string[][],
    mappings: CsvMappings<TransactionCsvFieldId>
): TransactionRow[] {
    const columnOf: Partial<Record<TransactionCsvFieldId, number>> = {};
    for (const [column, fieldId] of Object.entries(mappings)) {
        if (fieldId !== "skip") columnOf[fieldId] = parseInt(column, 10);
    }
    const cell = (row: string[], field: TransactionCsvFieldId) => {
        const index = columnOf[field];
        return index === undefined ? "" : String(row[index] ?? "");
    };

    return rows
        .filter((row) => row.some((value) => value !== null && value !== ""))
        .map((row, index) => {
            const amount = parseCurrency(cell(row, "amount"));
            const rawDate = cell(row, "date");
            const date = parseDate(rawDate);
            if (!date) {
                // +2: a linha 1 do arquivo é o cabeçalho.
                throw new Error(`Linha ${index + 2}: data inválida ou vazia ("${rawDate}").`);
            }
            return transactionRowSchema.parse({
                date,
                description: cell(row, "description") || "Sem descrição",
                category: cell(row, "category"),
                amount: Math.abs(amount),
                type: amount >= 0 ? "income" : "expense",
                status: parseStatus(cell(row, "status") || "paid"),
            });
        });
}
