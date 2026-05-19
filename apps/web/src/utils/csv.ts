import { z } from "zod";
import type { FieldId } from "@/features/financeiro/components/csv-importer";

export const parseCurrency = (val: string): number => {
    if (!val) return 0;
    // Remove everything except numbers, minus, comma and dot
    const clean = val.replace(/[^\d,.-]/g, "");

    // Check if it uses comma for decimals (brazilian format common in CSVs)
    // A comma followed by 2 digits at the end
    if (/,(\d{2})$/.test(clean)) {
        // 1.000,00 -> 1000.00
        return Number(clean.replace(/\./g, "").replace(",", "."));
    }
    return Number(clean);
};

export const parseDate = (val: string): Date => {
    if (!val) return new Date();

    // Try DD/MM/YYYY
    const match = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        let year = parseInt(match[3], 10);
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }

    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
};

export const parseStatus = (val: string): "paid" | "pending" => {
    const v = (val || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (v.includes("pag") || v.includes("rec") || v.includes("con") || v.includes("pai") || v.includes("done")) return "paid";
    return "pending";
};

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
 * Maps raw CSV rows to validated transaction objects using the user's column mappings.
 * Throws if any row fails schema validation.
 */
export function mapCsvRowsToTransactions(
    rows: any[][],
    mappings: Record<string, FieldId | "skip">
): TransactionRow[] {
    const reverseMap: Record<string, number> = {};
    Object.entries(mappings).forEach(([colIdx, fieldId]) => {
        if (fieldId !== "skip") reverseMap[fieldId] = parseInt(colIdx, 10);
    });

    return rows
        .filter((row) => row.some((cell) => cell !== null && cell !== ""))
        .map((row) => {
            const rawAmount = String(row[reverseMap["amount"]] ?? "");
            const amount = parseCurrency(rawAmount);
            const parsed = {
                date: parseDate(String(row[reverseMap["date"]] ?? "")),
                description: String(row[reverseMap["description"]] ?? "") || "Sem descrição",
                category: String(row[reverseMap["category"]] ?? ""),
                amount: Math.abs(amount),
                type: (amount >= 0 ? "income" : "expense") as "income" | "expense",
                status: parseStatus(String(row[reverseMap["status"]] ?? "paid")),
            };
            return transactionRowSchema.parse(parsed);
        });
}
