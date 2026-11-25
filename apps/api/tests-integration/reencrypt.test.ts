/// <reference types="bun" />

import { afterAll, describe, expect, it, spyOn } from "bun:test";
import { randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { decryptField, decryptWithKeyIndex, encrypt } from "../src/lib/encryption";
import { ReencryptError, reencryptAll } from "../src/lib/reencrypt";
import { createAppointment, createPatient, db, expectRejects, signUp } from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

const ANTIGA = process.env.ENCRYPTION_KEY!;
const NOVA = randomBytes(32).toString("base64");

function useKeys(keys: { ENCRYPTION_KEYS?: string; ENCRYPTION_KEY?: string }) {
    delete process.env.ENCRYPTION_KEYS;
    delete process.env.ENCRYPTION_KEY;
    for (const [name, value] of Object.entries(keys)) {
        if (value !== undefined) process.env[name] = value;
    }
}

afterAll(() => useKeys({ ENCRYPTION_KEY: ANTIGA }));

async function seedWithOldKey() {
    useKeys({ ENCRYPTION_KEY: ANTIGA });
    const ana = await signUp();
    const patientId = await createPatient(ana, { nome: "Maria Rotação", cpf: "123.456.789-01", email: "maria@rot.dev" });
    await ana.caller.patient.update({ id: patientId, nome: "Maria Rotação", cpf: "123.456.789-01", telefone: "(11) 97777-6666" });
    const appointmentId = await createAppointment(ana, patientId, { notes: "Anotação sigilosa" });
    const doc = await ana.caller.document.create({ title: "Contrato Rotação", content: "conteúdo" });
    const tx = await ana.caller.financial.create({ type: "income", description: "Sessão Rotação", amount: 100, date: new Date() });
    await db.execute(sql`update "user" set cpf = ${encrypt("987.654.321-00")} where id = ${ana.id}`);
    return { ana, patientId, appointmentId, docId: doc.id, txId: tx.id };
}

async function rawValues(ids: Awaited<ReturnType<typeof seedWithOldKey>>) {
    const [p] = await rows(sql`select nome, cpf, telefone from patient where id = ${ids.patientId}`);
    const [a] = await rows(sql`select notes from appointment where id = ${ids.appointmentId}`);
    const [d] = await rows(sql`select title, content from document where id = ${ids.docId}`);
    const [f] = await rows(sql`select description from financial_transaction where id = ${ids.txId}`);
    const [u] = await rows(sql`select cpf from "user" where id = ${ids.ana.id}`);
    const events = await rows<{ enc: string }>(
        sql`select data->>'__enc' as enc from event_store where aggregate_id in (${ids.patientId}, ${ids.appointmentId}) order by aggregate_id, version`
    );
    return [p.nome, p.cpf, p.telefone, a.notes, d.title, d.content, f.description, u.cpf, ...events.map((e) => e.enc)] as string[];
}

describe("db:reencrypt (rotação da ENCRYPTION_KEY)", () => {
    it("--dry-run conta por chave e não grava nada", async () => {
        const ids = await seedWithOldKey();
        await db.execute(sql`update patient set profissao = '10:30:00' where id = ${ids.patientId}`);
        const before = await rawValues(ids);

        useKeys({ ENCRYPTION_KEYS: `${NOVA},${ANTIGA}` });
        const report = await reencryptAll({ dryRun: true });
        expect(report.failures).toEqual([]);
        expect(report.fingerprints).toHaveLength(2);

        expect(report.dryRun).toBe(true);
        expect(report.after).toBeNull();
        expect(report.rewrittenValues).toBe(0);
        const patient = report.before.find((t) => t.table === "patient")!;
        const nome = patient.columns.find((c) => c.column === "nome")!;
        expect(patient.columns.find((c) => c.column === "profissao")!.plaintext).toBeGreaterThan(0);
        expect(nome.byKey[1]).toBeGreaterThan(0);
        expect(report.before.find((t) => t.table === "event_store")!.columns[0].byKey[1]).toBeGreaterThan(0);
        expect(await rawValues(ids)).toEqual(before);
    });

    it("valor que nenhuma chave decripta aborta sem gravar nada", async () => {
        const ids = await seedWithOldKey();
        const intruso = await createPatient(ids.ana, { nome: "Intruso" });
        useKeys({ ENCRYPTION_KEY: randomBytes(32).toString("base64") });
        const alheio = encrypt("cifrado com outra chave");
        await db.execute(sql`update patient set rg = ${alheio} where id = ${intruso}`);
        const before = await rawValues(ids);

        try {
            useKeys({ ENCRYPTION_KEYS: `${NOVA},${ANTIGA}` });
            const err = (await expectRejects(reencryptAll({ dryRun: false }))) as ReencryptError;
            expect(err).toBeInstanceOf(ReencryptError);
            expect(err.report.failures).toEqual([{ table: "patient", column: "rg", id: intruso }]);
            expect(err.message).not.toContain(alheio);
            expect(await rawValues(ids)).toEqual(before);
        } finally {
            await db.execute(sql`delete from patient where id = ${intruso}`);
            await db.execute(sql`delete from event_store where aggregate_id = ${intruso}`);
        }
    });

    it("regrava projeção, eventos e demais campos com a chave nova, e a antiga pode sair", async () => {
        const ids = await seedWithOldKey();
        const before = await rawValues(ids);

        useKeys({ ENCRYPTION_KEYS: `${NOVA},${ANTIGA}` });
        const report = await reencryptAll({ dryRun: false });
        expect(report.rewrittenValues).toBeGreaterThan(0);
        for (const table of report.after!) {
            const old = report.before.find((t) => t.table === table.table)!;
            expect(table.rows).toBe(old.rows);
            for (const c of table.columns) {
                expect(c.byKey[0]).toBe(c.encrypted);
                expect(c.byKey[1]).toBe(0);
            }
        }

        const after = await rawValues(ids);
        after.forEach((value, i) => {
            expect(value).not.toBe(before[i]);
            expect(decryptWithKeyIndex(value).keyIndex).toBe(0);
        });

        const again = await reencryptAll({ dryRun: false });
        expect(again.rewrittenValues).toBe(0);
        expect(await rawValues(ids)).toEqual(after);

        useKeys({ ENCRYPTION_KEYS: NOVA });
        const errorSpy = spyOn(console, "error");
        const read = await ids.ana.caller.patient.getById({ id: ids.patientId });
        expect(read.nome).toBe("Maria Rotação");
        expect(read.cpf).toBe("123.456.789-01");
        expect(read.telefone).toBe("(11) 97777-6666");
        await ids.ana.caller.patient.update({ id: ids.patientId, nome: "Maria Rotação", cpf: "123.456.789-01", telefone: "(11) 97777-6666", cidade: "Santos" });
        expect((await ids.ana.caller.patient.getById({ id: ids.patientId })).cidade).toBe("Santos");
        expect(decryptField(after[3])).toBe("Anotação sigilosa");
        expect((await ids.ana.caller.document.getById({ id: ids.docId }))?.title).toBe("Contrato Rotação");
        expect((await ids.ana.caller.psychologist.me())?.cpf).toBe("987.654.321-00");
        expect(errorSpy).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});
