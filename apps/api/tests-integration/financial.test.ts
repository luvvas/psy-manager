/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { createPatient, db, expectRejects, expectTrpcError, signUp } from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

const at = (iso: string) => new Date(`${iso}T12:00:00-03:00`);

describe("financeiro no banco real", () => {
    it("descrição cifrada no banco, status padrão paid e valor como numeric", async () => {
        const ana = await signUp();
        const tx = await ana.caller.financial.create({ type: "income", description: "Sessão Maria", amount: "180.50", date: at("2026-10-10") });
        const [raw] = await rows(sql`select description, status, amount from financial_transaction where id = ${tx.id}`);
        expect(raw.description).toStartWith("v1:");
        expect(raw.status).toBe("paid");
        expect(raw.amount).toBe("180.50");

        const [read] = await ana.caller.financial.list();
        expect(read.description).toBe("Sessão Maria");
    });

    it("filtro de período exige início e fim e inclui as duas pontas", async () => {
        const ana = await signUp();
        for (const d of ["2026-09-30", "2026-10-01", "2026-10-15", "2026-10-31", "2026-11-01"]) {
            await ana.caller.financial.create({ type: "expense", description: d, amount: 10, date: at(d) });
        }
        const inRange = await ana.caller.financial.list({
            startDate: new Date("2026-10-01T00:00:00-03:00"),
            endDate: new Date("2026-10-31T23:59:59-03:00"),
        });
        expect(inRange.map((t) => t.description).sort()).toEqual(["2026-10-01", "2026-10-15", "2026-10-31"]);

        const onlyStart = await ana.caller.financial.list({ startDate: new Date("2026-10-01T00:00:00-03:00") });
        expect(onlyStart.length).toBe(5);
    });

    it("lista em ordem de data decrescente com nome do paciente decriptado", async () => {
        const ana = await signUp();
        const p = await createPatient(ana, { nome: "Carlos Pagante" });
        await ana.caller.financial.create({ type: "income", description: "antiga", amount: 1, date: at("2026-01-01") });
        await ana.caller.financial.create({ type: "income", description: "nova", amount: 1, date: at("2026-06-01"), patientId: p });
        const list = await ana.caller.financial.list();
        expect(list.map((t) => t.description)).toEqual(["nova", "antiga"]);
        expect(list[0].patientNome).toBe("Carlos Pagante");
    });

    it("createMany (importação CSV) grava o lote inteiro numa só inserção", async () => {
        const ana = await signUp();
        const result = await ana.caller.financial.createMany([
            { type: "income", description: "csv 1", amount: 100, date: at("2026-10-01") },
            { type: "expense", description: "csv 2", amount: "50.25", date: at("2026-10-02"), status: "pending" },
        ]);
        expect(result.length).toBe(2);
        expect((await ana.caller.financial.list()).length).toBe(2);
        expect(await ana.caller.financial.createMany([])).toEqual([]);
    });

    it("createMany é atômico: um valor inválido não grava nada", async () => {
        const ana = await signUp();
        await expectRejects(
            ana.caller.financial.createMany([
                { type: "income", description: "ok", amount: 100, date: at("2026-10-01") },
                { type: "income", description: "ruim", amount: "abc", date: at("2026-10-01") },
            ])
        );
        expect(await ana.caller.financial.list()).toEqual([]);
    });

    it("lacuna conhecida: amount não numérico vira erro 500, não BAD_REQUEST", async () => {
        const ana = await signUp();
        await expectTrpcError(
            ana.caller.financial.create({ type: "income", description: "x", amount: "abc", date: at("2026-10-01") }),
            "INTERNAL_SERVER_ERROR"
        );
    });

    it("update com patientId null desvincula o paciente", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const tx = await ana.caller.financial.create({ type: "income", description: "x", amount: 1, date: at("2026-10-01"), patientId: p });
        await ana.caller.financial.update({ id: tx.id, patientId: null });
        expect((await ana.caller.financial.list())[0].patientId).toBeNull();
    });

    it("update e delete de transação alheia respondem null e não alteram nada", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const tx = await ana.caller.financial.create({ type: "income", description: "da Ana", amount: 1, date: at("2026-10-01") });
        expect(await bia.caller.financial.update({ id: tx.id, description: "invadido" })).toBeNull();
        expect(await bia.caller.financial.delete({ id: tx.id })).toBeNull();
        expect((await ana.caller.financial.list())[0].description).toBe("da Ana");
    });
});
