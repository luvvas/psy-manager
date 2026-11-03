/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { mapCsvRowsToTransactions, parseDate } from "../src/utils/csv";

describe("parseDate", () => {
    test("lê dd/mm/aaaa, dd-mm-aa e aaaa-mm-dd como o dia escrito (horário local)", () => {
        const expected = new Date(2026, 2, 5);
        expect(parseDate("05/03/2026")).toEqual(expected);
        expect(parseDate("5-3-26")).toEqual(expected);
        expect(parseDate(" 05/03/2026 14:30 ")).toEqual(expected);
        // Antes: a regex sem âncora lia "26-03-05" daqui e devolvia 26/03/2005.
        expect(parseDate("2026-03-05")).toEqual(expected);
        expect(parseDate("2026-03-05T12:00:00Z")).toEqual(expected);
    });

    test("vazia ou inválida vira null, nunca a data de hoje", () => {
        for (const val of ["", "   ", "abc", "31/02/2026", "00/01/2026", "15/13/2026", "2026-02-30", "Março 2026"]) {
            expect(parseDate(val)).toBeNull();
        }
    });
});

describe("mapCsvRowsToTransactions", () => {
    const mappings = { "0": "date", "1": "description", "2": "amount" } as const;

    test("mapeia valores e o sinal do valor vira o tipo", () => {
        const [income, expense] = mapCsvRowsToTransactions(
            [
                ["05/03/2026", "Sessão", "150,00"],
                ["06/03/2026", "Aluguel", "-1.200,50"],
            ],
            mappings,
        );
        expect(income).toMatchObject({ date: new Date(2026, 2, 5), amount: 150, type: "income" });
        expect(expense).toMatchObject({ amount: 1200.5, type: "expense" });
    });

    test("data inválida aponta a linha do arquivo em vez de gravar hoje", () => {
        expect(() =>
            mapCsvRowsToTransactions(
                [
                    ["05/03/2026", "Sessão", "150"],
                    ["31/02/2026", "Sessão", "150"],
                ],
                mappings,
            ),
        ).toThrow('Linha 3: data inválida ou vazia ("31/02/2026").');
    });
});
