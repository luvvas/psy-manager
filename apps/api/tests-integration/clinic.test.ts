/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import {
    CLINIC_INPUT,
    createAppointment,
    createPatient,
    db,
    expectTrpcError,
    sharedClinic,
    signUp,
    uniqueEmail,
} from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

describe("clínica: dona e permissões", () => {
    it("criadora entra como membro ativo e vê a clínica", async () => {
        const ana = await signUp();
        const clinic = await ana.caller.clinic.create(CLINIC_INPUT);
        const [listed] = await ana.caller.clinic.list();
        expect(listed.id).toBe(clinic.id);
        expect(listed.psychologists.map((p) => p.id)).toEqual([ana.id]);
    });

    it("só a criadora edita, apaga e gerencia salas; membro ativo recebe NOT_FOUND", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const { clinicId, roomId } = await sharedClinic(ana, bia);

        await expectTrpcError(bia.caller.clinic.update({ id: clinicId, ...CLINIC_INPUT, name: "Tomada" }), "NOT_FOUND");
        await expectTrpcError(bia.caller.clinic.delete({ id: clinicId }), "NOT_FOUND");
        await expectTrpcError(bia.caller.clinic.addRoom({ clinicId, name: "Sala B" }), "NOT_FOUND");
        await expectTrpcError(bia.caller.clinic.renameRoom({ roomId, name: "X" }), "NOT_FOUND");
        await expectTrpcError(bia.caller.clinic.removeRoom({ roomId }), "NOT_FOUND");
        await expectTrpcError(
            bia.caller.clinic.linkPsychologist({ clinicId, psychologistEmail: uniqueEmail() }),
            "BAD_REQUEST"
        );

        const updated = await ana.caller.clinic.update({ id: clinicId, ...CLINIC_INPUT, name: "Renomeada" });
        expect(updated.name).toBe("Renomeada");
    });

    it("remover sala só arquiva e ela some da listagem", async () => {
        const ana = await signUp();
        const clinic = await ana.caller.clinic.create(CLINIC_INPUT);
        const room = await ana.caller.clinic.addRoom({ clinicId: clinic.id, name: "Sala Z" });
        await ana.caller.clinic.removeRoom({ roomId: room!.id });

        expect((await ana.caller.clinic.list())[0].rooms).toEqual([]);
        const [raw] = await rows(sql`select active from clinic_room where id = ${room!.id}`);
        expect(raw.active).toBe(false);
        await expectTrpcError(ana.caller.clinic.renameRoom({ roomId: room!.id, name: "Volta" }), "NOT_FOUND");
    });

    it("API aceita sala com nome repetido (a checagem existe só no web)", async () => {
        const ana = await signUp();
        const clinic = await ana.caller.clinic.create(CLINIC_INPUT);
        await ana.caller.clinic.addRoom({ clinicId: clinic.id, name: "Sala 1" });
        await ana.caller.clinic.addRoom({ clinicId: clinic.id, name: "Sala 1" });
        expect((await ana.caller.clinic.list())[0].rooms.length).toBe(2);
    });

    it("apagar clínica mantém as sessões e zera clínica e sala delas", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const { clinicId, roomId } = await sharedClinic(ana, bia);
        const pb = await createPatient(bia);
        const id = await createAppointment(bia, pb, { roomId });

        await ana.caller.clinic.delete({ id: clinicId });

        const [row] = (await bia.caller.appointment.list()).filter((a) => a.id === id);
        expect(row.clinicId).toBeNull();
        expect(row.roomId).toBeNull();
        expect(await bia.caller.clinic.list()).toEqual([]);
    });
});

describe("clínica: convites", () => {
    it("convite fica pendente até aceitar; pendente não vê a clínica", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const clinic = await ana.caller.clinic.create(CLINIC_INPUT);
        await ana.caller.clinic.linkPsychologist({ clinicId: clinic.id, psychologistEmail: bia.email });

        expect(await bia.caller.clinic.list()).toEqual([]);
        const invites = await bia.caller.clinic.listInvites();
        expect(invites.map((i) => i.clinicId)).toEqual([clinic.id]);
        expect((await ana.caller.clinic.list())[0].psychologists.map((p) => p.id)).toEqual([ana.id]);

        await bia.caller.clinic.acceptInvite({ clinicId: clinic.id });
        expect((await bia.caller.clinic.list()).map((c) => c.id)).toEqual([clinic.id]);
        expect(await bia.caller.clinic.listInvites()).toEqual([]);
    });

    it("recusar apaga o convite; aceitar ou recusar sem convite é NOT_FOUND", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const clinic = await ana.caller.clinic.create(CLINIC_INPUT);
        await ana.caller.clinic.linkPsychologist({ clinicId: clinic.id, psychologistEmail: bia.email });
        await bia.caller.clinic.declineInvite({ clinicId: clinic.id });

        expect(await bia.caller.clinic.listInvites()).toEqual([]);
        await expectTrpcError(bia.caller.clinic.acceptInvite({ clinicId: clinic.id }), "NOT_FOUND");
        await expectTrpcError(bia.caller.clinic.declineInvite({ clinicId: clinic.id }), "NOT_FOUND");
    });

    it("convite para e-mail inexistente responde sucesso sem criar vínculo", async () => {
        const ana = await signUp();
        const clinic = await ana.caller.clinic.create(CLINIC_INPUT);
        const result = await ana.caller.clinic.linkPsychologist({ clinicId: clinic.id, psychologistEmail: uniqueEmail("fantasma") });
        expect(result).toEqual({ success: true });
        const links = await rows(sql`select id from psychologist_clinic where clinic_id = ${clinic.id}`);
        expect(links.length).toBe(1);
    });

    it("convidar de novo quem já tem vínculo não duplica", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const clinic = await ana.caller.clinic.create(CLINIC_INPUT);
        await ana.caller.clinic.linkPsychologist({ clinicId: clinic.id, psychologistEmail: bia.email });
        await ana.caller.clinic.linkPsychologist({ clinicId: clinic.id, psychologistEmail: bia.email });
        const links = await rows(sql`select id from psychologist_clinic where clinic_id = ${clinic.id} and psychologist_id = ${bia.id}`);
        expect(links.length).toBe(1);
    });

    it("dona não sai nem se desvincula; membro sai; sair sem vínculo é NOT_FOUND", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const { clinicId } = await sharedClinic(ana, bia);

        await expectTrpcError(ana.caller.clinic.leave({ clinicId }), "BAD_REQUEST");
        await expectTrpcError(ana.caller.clinic.unlinkPsychologist({ clinicId, psychologistId: ana.id }), "BAD_REQUEST");

        await bia.caller.clinic.leave({ clinicId });
        expect(await bia.caller.clinic.list()).toEqual([]);
        await expectTrpcError(bia.caller.clinic.leave({ clinicId }), "NOT_FOUND");
    });

    it("sair também cancela convite pendente", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const clinic = await ana.caller.clinic.create(CLINIC_INPUT);
        await ana.caller.clinic.linkPsychologist({ clinicId: clinic.id, psychologistEmail: bia.email });
        await bia.caller.clinic.leave({ clinicId: clinic.id });
        expect(await bia.caller.clinic.listInvites()).toEqual([]);
    });

    it("desvincular quem não é membro responde null sem erro", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const clinic = await ana.caller.clinic.create(CLINIC_INPUT);
        expect(await ana.caller.clinic.unlinkPsychologist({ clinicId: clinic.id, psychologistId: bia.id })).toBeNull();
    });
});
