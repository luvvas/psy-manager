import Papa from "papaparse";
import { endOfMonth, isValid, parse, startOfMonth } from "date-fns";

export interface ExportableTransaction {
    type: string;
    description: string;
    amount: string | number;
    date: Date | string;
    category: string | null;
    status: string;
    patientNome: string | null;
}

export const FINANCIAL_CSV_HEADERS = [
    "Data",
    "Descrição",
    "Categoria",
    "Paciente",
    "Situação",
    "Entrada",
    "Saída",
    "Saldo",
] as const;

const STATUS_LABELS: Record<string, string> = {
    paid: "Pago",
    pending: "Pendente",
};

const CSV_DATE = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function toCents(amount: string | number): number {
    const n = Number(amount);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function formatCsvAmount(cents: number): string {
    const sign = cents < 0 ? "-" : "";
    const abs = Math.abs(cents);
    const reais = Math.floor(abs / 100);
    const centavos = String(abs % 100).padStart(2, "0");
    return `${sign}${reais},${centavos}`;
}

function safeText(value: string | null | undefined): string {
    const text = (value ?? "").trim();
    return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

export function parseExportMonth(month: string): { startDate: Date; endDate: Date } | null {
    if (!/^\d{4}-\d{2}$/.test(month)) return null;
    const base = parse(month, "yyyy-MM", new Date());
    if (!isValid(base)) return null;
    return { startDate: startOfMonth(base), endDate: endOfMonth(base) };
}

export function financialCsvFileName(month: string): string {
    return `financeiro-${month}.csv`;
}

export function buildFinancialCsv(transactions: readonly ExportableTransaction[]): string {
    let incomeCents = 0;
    let expenseCents = 0;

    const sorted = [...transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const rows = sorted.map((tx) => {
        const cents = toCents(tx.amount);
        const isIncome = tx.type === "income";
        const isExpense = tx.type === "expense";
        if (isIncome) incomeCents += cents;
        else if (isExpense) expenseCents += cents;
        return [
            CSV_DATE.format(new Date(tx.date)),
            safeText(tx.description),
            safeText(tx.category),
            safeText(tx.patientNome),
            STATUS_LABELS[tx.status] ?? tx.status,
            isIncome ? formatCsvAmount(cents) : "",
            isExpense ? formatCsvAmount(cents) : "",
            "",
        ];
    });

    rows.push([
        "Totais",
        "",
        "",
        "",
        "",
        formatCsvAmount(incomeCents),
        formatCsvAmount(expenseCents),
        formatCsvAmount(incomeCents - expenseCents),
    ]);

    const body = Papa.unparse(
        { fields: [...FINANCIAL_CSV_HEADERS], data: rows },
        { delimiter: ";", newline: "\r\n" }
    );
    return `\uFEFF${body}`;
}
