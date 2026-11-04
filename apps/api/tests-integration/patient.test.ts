/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { patientCommands } from "../src/cqrs/patient/patient.commands";
import {
    createAppointment,
    createPatient,
    db,
    expectRejects,
    expectTrpcError,
    signUp,
} from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

describe("paciente via CQRS no banco real", () => {
    it("create grava evento criptografado e projeção com PII cifrada", async () => {
        const ana = await signUp();
        const id = await createPatient(ana, {
            nome: "Maria Sigilosa",
            email: "maria@paciente.dev",
            cpf: "123.456.789-01",
            telefone: "(11) 98888-7777",
            cidade: "Campinas",
        });

        const [event] = await rows(sql`select type, version, data from event_store where aggregate_id = ${id}`);
        expect(event.type).toBe("PATIENT_CREATED");
        expect(event.version).toBe(1);
        expect(typeof event.data.__enc).toBe("string");
        expect(JSON.stringify(event.data)).not.toContain("Maria Sigilosa");

        const [raw] = await rows(sql`select nome, email, cpf, telefone, cidade from patient where id = ${id}`);
        expect(raw.nome).not.toBe("Maria Sigilosa");
        expect(raw.nome).toStartWith("v1:");
        expect(raw.email).toStartWith("v1:");
        expect(raw.cpf).toStartWith("v1:");
        expect(raw.telefone).toStartWith("v1:");
        expect(raw.cidade).toBe("Campinas");

        const read = await ana.caller.patient.getById({ id });
        expect(read.nome).toBe("Maria Sigilosa");
        expect(read.email).toBe("maria@paciente.dev");
        expect(read.cpf).toBe("123.456.789-01");
    });

    it("update incrementa a versão e reflete na leitura", async () => {
        const ana = await signUp();
        const id = await createPatient(ana, { nome: "Antes" });
        await ana.caller.patient.update({ id, nome: "Depois", cidade: "Santos" });
        await ana.caller.patient.update({ id, nome: "Depois 2" });

        const versions = await rows<{ version: number; type: string }>(
            sql`select version, type from event_store where aggregate_id = ${id} order by version`
        );
        expect(versions.map((v) => v.version)).toEqual([1, 2, 3]);
        expect(versions.map((v) => v.type)).toEqual(["PATIENT_CREATED", "PATIENT_UPDATED", "PATIENT_UPDATED"]);
        expect((await ana.caller.patient.getById({ id })).nome).toBe("Depois 2");
    });

    it("delete remove a projeção e bloqueia update e novo delete", async () => {
        const ana = await signUp();
        const id = await createPatient(ana);
        await ana.caller.patient.delete({ id });

        await expectTrpcError(ana.caller.patient.getById({ id }), "NOT_FOUND");
        expect((await ana.caller.patient.list()).find((p) => p.id === id)).toBeUndefined();
        await expectRejects(ana.caller.patient.update({ id, nome: "Fantasma" }));
        await expectRejects(ana.caller.patient.delete({ id }));
    });

    it("validação de entrada: CPF e e-mail inválidos são BAD_REQUEST", async () => {
        const ana = await signUp();
        await expectTrpcError(ana.caller.patient.create({ nome: "X", cpf: "123" } as any), "BAD_REQUEST");
        await expectTrpcError(ana.caller.patient.create({ nome: "X", email: "sem-arroba" } as any), "BAD_REQUEST");
        await expectTrpcError(ana.caller.patient.create({ nome: "" } as any), "BAD_REQUEST");
    });

    it("dois updates concorrentes na mesma versão: só um grava", async () => {
        const ana = await signUp();
        const id = await createPatient(ana, { nome: "Concorrente" });

        const results = await Promise.allSettled(
            Array.from({ length: 5 }, (_, i) =>
                patientCommands.update({ id, nome: `Versão ${i}`, psychologistId: ana.id })
            )
        );
        const failed = results.filter((r) => r.status === "rejected");
        expect(failed.length).toBeGreaterThan(0);

        const versions = await rows<{ version: number }>(
            sql`select version from event_store where aggregate_id = ${id} order by version`
        );
        const numbers = versions.map((v) => v.version);
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
    });

    it("excluir paciente apaga agendamentos, documentos e prontuários e desvincula transações", async () => {
        const ana = await signUp();
        const id = await createPatient(ana, { nome: "Com Histórico" });
        const appointmentId = await createAppointment(ana, id);
        await ana.caller.document.create({ title: "Contrato", patientId: id });
        const record = await ana.caller.clinicalRecord.create({ title: "Sessão 1", patientId: id, textContent: "Evolução" });
        await ana.caller.clinicalRecord.finalize({ id: record.id });
        const tx = await ana.caller.financial.create({ type: "income", description: "Sessão", amount: 200, date: new Date(), patientId: id });

        await ana.caller.patient.delete({ id });

        expect((await ana.caller.appointment.list()).find((a) => a.id === appointmentId)).toBeUndefined();
        expect((await ana.caller.document.list()).filter((d) => d.patientId === id)).toEqual([]);
        expect(await ana.caller.clinicalRecord.getById({ id: record.id })).toBeNull();
        const [txRow] = (await ana.caller.financial.list()).filter((t) => t.id === tx.id);
        expect(txRow.patientId).toBeNull();

        const [orphanEvents] = await rows<{ count: number }>(
            sql`select count(*)::int as count from event_store where aggregate_id = ${appointmentId}`
        );
        expect(orphanEvents.count).toBeGreaterThan(0);
    });

    it("createMany grava todos os pacientes do lote", async () => {
        const ana = await signUp();
        const result = await ana.caller.patient.createMany([
            { nome: "Lote 1", email: "lote1@paciente.dev" },
            { nome: "Lote 2", cpf: "98765432100" },
        ] as any);
        expect(result.count).toBe(2);
        const names = (await ana.caller.patient.list()).map((p) => p.nome).sort();
        expect(names).toEqual(["Lote 1", "Lote 2"]);
    });

    it("lacuna conhecida: valorSessao não numérico responde sucesso, mas a projeção falha e o paciente some", async () => {
        const ana = await signUp();
        const startedAt = new Date(Date.now() - 1000);
        const result = await ana.caller.patient.createMany([{ nome: "Visível" }, { nome: "Perdido", valorSessao: "abc" }] as any);
        expect(result.count).toBe(2);

        const names = (await ana.caller.patient.list()).map((p) => p.nome);
        expect(names).toEqual(["Visível"]);

        const [orphan] = await rows<{ count: number }>(
            sql`select count(*)::int as count from event_store e
                where e.type = 'PATIENT_CREATED' and e.created_at >= ${startedAt.toISOString()}
                and not exists (select 1 from patient p where p.id = e.aggregate_id)`
        );
        expect(orphan.count).toBeGreaterThanOrEqual(1);
    });
});
