/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import Papa from "papaparse";
import {
    buildFinancialCsv,
    financialCsvFileName,
    formatCsvAmount,
    parseExportMonth,
    type ExportableTransaction,
} from "../src/features/financeiro/csv-export";

function parseCsv(csv: string): string[][] {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    return Papa.parse<string[]>(csv.slice(1), { delimiter: ";" }).data;
}

const HEADER = ["Data", "Descrição", "Categoria", "Paciente", "Situação", "Entrada", "Saída", "Saldo"];

describe("buildFinancialCsv", () => {
    test("mês sem transações gera só cabeçalho e totais zerados", () => {
        const csv = buildFinancialCsv([]);
        expect(parseCsv(csv)).toEqual([HEADER, ["Totais", "", "", "", "", "0,00", "0,00", "0,00"]]);
        expect(csv).toContain("\r\n");
    });

    test("ordena por data, usa o dia em UTC como a tabela, separa entradas e saídas e soma sem erro de arredondamento", () => {
        const transactions: ExportableTransaction[] = [
            {
                type: "expense",
                description: "Aluguel; sala 2",
                amount: "1500.20",
                date: new Date(Date.UTC(2026, 10, 10, 12, 0)),
                category: "Aluguel",
                status: "pending",
                patientNome: null,
            },
            {
                type: "income",
                description: "Sessão \"inicial\"",
                amount: "0.10",
                date: "2026-11-03T00:00:00.000Z",
                category: "Consulta",
                status: "paid",
                patientNome: "João Ávila",
            },
            {
                type: "income",
                description: "Sessão",
                amount: 1234.2,
                date: new Date(Date.UTC(2026, 10, 30, 23, 30)),
                category: null,
                status: "paid",
                patientNome: "Maria",
            },
        ];

        expect(parseCsv(buildFinancialCsv(transactions))).toEqual([
            HEADER,
            ["03/11/2026", "Sessão \"inicial\"", "Consulta", "João Ávila", "Pago", "0,10", "", ""],
            ["10/11/2026", "Aluguel; sala 2", "Aluguel", "", "Pendente", "", "1500,20", ""],
            ["30/11/2026", "Sessão", "", "Maria", "Pago", "1234,20", "", ""],
            ["Totais", "", "", "", "", "1234,30", "1500,20", "-265,90"],
        ]);
    });

    test("texto que o Excel leria como fórmula vira texto literal", () => {
        const [, row] = parseCsv(
            buildFinancialCsv([
                {
                    type: "income",
                    description: "=HYPERLINK(\"x\")",
                    amount: "10",
                    date: new Date(Date.UTC(2026, 0, 1, 12)),
                    category: "+cat",
                    status: "paid",
                    patientNome: "@nome",
                },
            ])
        );
        expect(row.slice(1, 4)).toEqual(["'=HYPERLINK(\"x\")", "'+cat", "'@nome"]);
    });
});

describe("formatCsvAmount", () => {
    test("usa vírgula decimal, sem separador de milhar", () => {
        expect(formatCsvAmount(0)).toBe("0,00");
        expect(formatCsvAmount(5)).toBe("0,05");
        expect(formatCsvAmount(123456789)).toBe("1234567,89");
        expect(formatCsvAmount(-1050)).toBe("-10,50");
    });
});

describe("parseExportMonth", () => {
    test("devolve o primeiro e o último instante do mês", () => {
        const range = parseExportMonth("2026-02");
        expect(range?.startDate).toEqual(new Date(2026, 1, 1));
        expect(range?.endDate).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
    });

    test("valor vazio ou inválido vira null", () => {
        for (const value of ["", "2026", "2026-13", "abc"]) {
            expect(parseExportMonth(value)).toBeNull();
        }
    });

    test("nome do arquivo segue financeiro-AAAA-MM.csv", () => {
        expect(financialCsvFileName("2026-11")).toBe("financeiro-2026-11.csv");
    });
});
