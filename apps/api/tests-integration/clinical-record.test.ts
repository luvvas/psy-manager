/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { existsSync } from "fs";
import { sql } from "drizzle-orm";
import { toLocalFilePath } from "../src/utils/storage.utils";
import { createAppointment, createPatient, db, expectTrpcError, get, signUp, uploadPdf } from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

describe("prontuário no banco real", () => {
    it("nasce rascunho, categoria padrão evolucao, título e texto cifrados", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const { id } = await ana.caller.clinicalRecord.create({ title: "Sessão 1", patientId: p, textContent: "Relato sensível" });

        const [raw] = await rows(sql`select title, text_content, status, category, locked_at from clinical_record where id = ${id}`);
        expect(raw.status).toBe("draft");
        expect(raw.category).toBe("evolucao");
        expect(raw.locked_at).toBeNull();
        expect(raw.title).toStartWith("v1:");
        expect(raw.text_content).toStartWith("v1:");

        const read = await ana.caller.clinicalRecord.getById({ id });
        expect(read?.textContent).toBe("Relato sensível");
    });

    it("rascunho pode ser editado e excluído", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const { id } = await ana.caller.clinicalRecord.create({ title: "Rascunho", patientId: p });
        await ana.caller.clinicalRecord.update({ id, textContent: "Revisado" });
        expect((await ana.caller.clinicalRecord.getById({ id }))?.textContent).toBe("Revisado");
        await ana.caller.clinicalRecord.delete({ id });
        expect(await ana.caller.clinicalRecord.getById({ id })).toBeNull();
    });

    it("finalizado fica travado: editar e excluir são FORBIDDEN; finalizar de novo é idempotente", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const { id } = await ana.caller.clinicalRecord.create({ title: "Final", patientId: p, textContent: "Original" });
        await ana.caller.clinicalRecord.finalize({ id });

        const [first] = await rows(sql`select status, locked_at from clinical_record where id = ${id}`);
        expect(first.status).toBe("finalized");
        expect(first.locked_at).not.toBeNull();

        await expectTrpcError(ana.caller.clinicalRecord.update({ id, textContent: "Adulterado" }), "FORBIDDEN");
        await expectTrpcError(ana.caller.clinicalRecord.delete({ id }), "FORBIDDEN");
        await ana.caller.clinicalRecord.finalize({ id });

        const [second] = await rows(sql`select locked_at from clinical_record where id = ${id}`);
        expect(new Date(second.locked_at).getTime()).toBe(new Date(first.locked_at).getTime());
        expect((await ana.caller.clinicalRecord.getById({ id }))?.textContent).toBe("Original");
    });

    it("finalizar inexistente é NOT_FOUND; editar inexistente é FORBIDDEN", async () => {
        const ana = await signUp();
        await expectTrpcError(ana.caller.clinicalRecord.finalize({ id: "nao-existe" }), "NOT_FOUND");
        await expectTrpcError(ana.caller.clinicalRecord.update({ id: "nao-existe", title: "x" }), "FORBIDDEN");
    });

    it("lista por paciente", async () => {
        const ana = await signUp();
        const p1 = await createPatient(ana);
        const p2 = await createPatient(ana);
        await ana.caller.clinicalRecord.create({ title: "Do 1", patientId: p1 });
        await ana.caller.clinicalRecord.create({ title: "Do 2", patientId: p2 });
        expect((await ana.caller.clinicalRecord.list({ patientId: p1 })).map((r) => r.title)).toEqual(["Do 1"]);
    });

    it("PDF anexado é lido pela URL de storage e apagado com o rascunho", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const { target } = await uploadPdf(ana, "clinicalRecord");
        const { id } = await ana.caller.clinicalRecord.create({ title: "Com PDF", patientId: p, storageKey: target.storageKey });

        const read = await ana.caller.clinicalRecord.getDownloadUrl({ id });
        expect((await get(read!.url!)).status).toBe(200);

        await ana.caller.clinicalRecord.delete({ id });
        expect(existsSync(toLocalFilePath(target.storageKey))).toBe(false);
    });

    it("lacuna conhecida: aceita agendamento de outro paciente da mesma psicóloga", async () => {
        const ana = await signUp();
        const p1 = await createPatient(ana);
        const p2 = await createPatient(ana);
        const appointmentOfP2 = await createAppointment(ana, p2);
        const { id } = await ana.caller.clinicalRecord.create({ title: "Cruzado", patientId: p1, appointmentId: appointmentOfP2 });
        expect((await ana.caller.clinicalRecord.getById({ id }))?.appointmentId).toBe(appointmentOfP2);
    });
});
