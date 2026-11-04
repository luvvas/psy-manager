/// <reference types="bun" />

import { describe, expect, it, spyOn } from "bun:test";
import { existsSync } from "fs";
import { sql } from "drizzle-orm";
import { emailService } from "../src/services/email.service";
import { toLocalFilePath } from "../src/utils/storage.utils";
import {
    PASSWORD,
    type TestUser,
    appointmentInput,
    authRequest,
    createAppointment,
    callerForCookie,
    createPatient,
    db,
    expectTrpcError,
    sharedClinic,
    signUp,
    uploadPdf,
} from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

async function populate(user: TestUser) {
    const patientId = await createPatient(user, { nome: `Paciente de ${user.name}` });
    const appointmentId = await createAppointment(user, patientId);
    const { target } = await uploadPdf(user);
    const doc = await user.caller.document.create({ title: "Doc", storageKey: target.storageKey, patientId });
    const record = await user.caller.clinicalRecord.create({ title: "Registro", patientId, textContent: "texto" });
    const tx = await user.caller.financial.create({ type: "income", description: "Sessão", amount: 100, date: new Date(), patientId });
    return { patientId, appointmentId, docId: doc.id, recordId: record.id, txId: tx.id, storageKey: target.storageKey };
}

describe("isolamento entre psicólogas", () => {
    it("B não lê nem altera nada de A", async () => {
        const ana = await signUp("Ana Isolada");
        const bia = await signUp("Bia Curiosa");
        const a = await populate(ana);

        expect(await bia.caller.patient.list()).toEqual([]);
        expect(await bia.caller.appointment.list()).toEqual([]);
        expect(await bia.caller.document.list()).toEqual([]);
        expect(await bia.caller.clinicalRecord.list()).toEqual([]);
        expect(await bia.caller.financial.list()).toEqual([]);

        await expectTrpcError(bia.caller.patient.getById({ id: a.patientId }), "NOT_FOUND");
        expect(await bia.caller.document.getById({ id: a.docId })).toBeNull();
        expect(await bia.caller.document.getDownloadUrl({ id: a.docId })).toBeNull();
        expect(await bia.caller.clinicalRecord.getById({ id: a.recordId })).toBeNull();
        expect(await bia.caller.clinicalRecord.getDownloadUrl({ id: a.recordId })).toBeNull();

        await expectTrpcError(bia.caller.patient.update({ id: a.patientId, nome: "Invadido" }), "NOT_FOUND");
        await expectTrpcError(bia.caller.patient.delete({ id: a.patientId }), "NOT_FOUND");
        await expectTrpcError(bia.caller.appointment.delete({ id: a.appointmentId }), "NOT_FOUND");
        await expectTrpcError(bia.caller.document.update({ id: a.docId, title: "x" }), "NOT_FOUND");
        await expectTrpcError(bia.caller.document.delete({ id: a.docId }), "NOT_FOUND");
        await expectTrpcError(bia.caller.clinicalRecord.update({ id: a.recordId, title: "x" }), "FORBIDDEN");
        await expectTrpcError(bia.caller.clinicalRecord.finalize({ id: a.recordId }), "NOT_FOUND");
        await expectTrpcError(bia.caller.clinicalRecord.delete({ id: a.recordId }), "FORBIDDEN");

        expect((await ana.caller.patient.getById({ id: a.patientId })).nome).toBe("Paciente de Ana Isolada");
        expect((await ana.caller.clinicalRecord.getById({ id: a.recordId }))?.status).toBe("draft");
        expect((await ana.caller.document.list()).length).toBe(1);
    });

    it("B não usa IDs de A nas próprias escritas", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const a = await populate(ana);
        const bPatient = await createPatient(bia);

        await expectTrpcError(bia.caller.appointment.create(appointmentInput(a.patientId) as any), "FORBIDDEN");
        await expectTrpcError(
            bia.caller.appointment.update({ id: a.appointmentId, ...appointmentInput(bPatient) } as any),
            "NOT_FOUND"
        );
        await expectTrpcError(
            bia.caller.financial.create({ type: "income", description: "x", amount: 1, date: new Date(), patientId: a.patientId }),
            "FORBIDDEN"
        );
        await expectTrpcError(bia.caller.document.create({ title: "x", patientId: a.patientId }), "FORBIDDEN");
        await expectTrpcError(bia.caller.clinicalRecord.create({ title: "x", patientId: a.patientId }), "FORBIDDEN");
        await expectTrpcError(
            bia.caller.clinicalRecord.create({ title: "x", patientId: bPatient, appointmentId: a.appointmentId }),
            "FORBIDDEN"
        );
        await expectTrpcError(
            bia.caller.clinicalRecord.create({ title: "x", patientId: bPatient, storageKey: a.storageKey }),
            "FORBIDDEN"
        );
    });

    it("B não usa sala de clínica da qual não participa", async () => {
        const ana = await signUp();
        const carla = await signUp();
        const bia = await signUp();
        const { roomId, clinicId } = await sharedClinic(ana, carla);
        const bPatient = await createPatient(bia);
        await expectTrpcError(bia.caller.appointment.create(appointmentInput(bPatient, { roomId }) as any), "FORBIDDEN");
        await expectTrpcError(bia.caller.appointment.freeSlots({ date: new Date(), clinicId }), "FORBIDDEN");
    });

    it("exportação traz só os dados da própria psicóloga, decriptados", async () => {
        const ana = await signUp();
        const bia = await signUp();
        await populate(ana);
        await populate(bia);

        const exported = await bia.caller.psychologist.exportData();
        expect(exported.psychologist.id).toBe(bia.id);
        expect(exported.patients.map((p) => p.nome)).toEqual([`Paciente de ${bia.name}`]);
        expect(exported.appointments.length).toBe(1);
        expect(exported.documents.length).toBe(1);
        expect("content" in exported.documents[0]).toBe(false);
        expect(JSON.stringify(exported)).not.toContain(ana.id);
    });
});

describe("conta", () => {
    it("redefinição de senha dispara o e-mail com o link", async () => {
        const ana = await signUp();
        const spy = spyOn(emailService, "sendPasswordReset").mockImplementation(async () => {});
        try {
            const response = await authRequest("/api/auth/request-password-reset", {
                email: ana.email,
                redirectTo: "http://localhost:5173/redefinir-senha",
            });
            expect(response.status).toBe(200);
            expect(spy).toHaveBeenCalledTimes(1);
            const [to, url] = spy.mock.calls[0];
            expect(to).toBe(ana.email);
            expect(url).toContain("reset-password");
        } finally {
            spy.mockRestore();
        }
    });

    it("excluir conta apaga dados, eventos e arquivos sem tocar nos de outra psicóloga", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const { clinicId } = await sharedClinic(bia, ana);
        const a = await populate(ana);
        const b = await populate(bia);
        await ana.caller.clinicalRecord.finalize({ id: a.recordId });

        await ana.caller.psychologist.deleteAccount();

        for (const table of ["patient", "appointment", "document", "clinical_record", "financial_transaction"]) {
            const [count] = await rows<{ n: number }>(
                sql`select count(*)::int as n from ${sql.identifier(table)} where psychologist_id = ${ana.id}`
            );
            expect(count.n).toBe(0);
        }
        const [events] = await rows<{ n: number }>(
            sql`select count(*)::int as n from event_store where aggregate_id in (${a.patientId}, ${a.appointmentId})`
        );
        expect(events.n).toBe(0);
        expect(existsSync(toLocalFilePath(a.storageKey))).toBe(false);

        expect(existsSync(toLocalFilePath(b.storageKey))).toBe(true);
        expect((await bia.caller.patient.list()).length).toBe(1);
        const [clinic] = await bia.caller.clinic.list();
        expect(clinic.id).toBe(clinicId);
        expect(clinic.psychologists.map((p) => p.id)).toEqual([bia.id]);

        const login = await authRequest("/api/auth/sign-in/email", { email: ana.email, password: PASSWORD });
        expect(login.status).toBe(401);
        await expectTrpcError((await callerForCookie(ana.cookie)).psychologist.me(), "UNAUTHORIZED");
    });
});
