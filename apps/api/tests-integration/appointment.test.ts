/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import {
    FULL_WEEK_SCHEDULE,
    appointmentInput,
    createAppointment,
    createPatient,
    db,
    expectRejects,
    expectTrpcError,
    localDate,
    sharedClinic,
    signUp,
} from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

function atLocal(day: Date, hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
}

describe("agendamento: conflitos de horário próprio", () => {
    it("sessão sobreposta é CONFLICT e passa com allowScheduleConflicts", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        await createAppointment(ana, p, { startTime: "10:00", endTime: "10:50" });

        const err = await expectTrpcError(
            ana.caller.appointment.create(appointmentInput(p, { startTime: "10:30", endTime: "11:20" }) as any),
            "CONFLICT"
        );
        expect(err.message).toContain("10:00 às 10:50");

        await ana.caller.appointment.create(
            appointmentInput(p, { startTime: "10:30", endTime: "11:20", allowScheduleConflicts: true }) as any
        );
        expect((await ana.caller.appointment.list()).length).toBe(2);
    });

    it("sessões encostadas não conflitam e canceladas não ocupam horário", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        await createAppointment(ana, p, { startTime: "10:00", endTime: "10:50" });
        await createAppointment(ana, p, { startTime: "10:50", endTime: "11:40" });
        await createAppointment(ana, p, { startTime: "14:00", endTime: "14:50", status: "cancelled" });
        await createAppointment(ana, p, { startTime: "14:00", endTime: "14:50" });
        expect((await ana.caller.appointment.list()).length).toBe(4);
    });

    it("fim antes do início é BAD_REQUEST e horário fora de HH:MM também", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        await expectTrpcError(
            ana.caller.appointment.create(appointmentInput(p, { startTime: "11:00", endTime: "10:00" }) as any),
            "BAD_REQUEST"
        );
        await expectTrpcError(
            ana.caller.appointment.create(appointmentInput(p, { startTime: "9:00" }) as any),
            "BAD_REQUEST"
        );
    });

    it("fora do expediente é CONFLICT só quando há agenda configurada", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        await createAppointment(ana, p, { startTime: "20:00", endTime: "20:50" });

        await ana.caller.psychologist.updateProfile({ workSchedule: FULL_WEEK_SCHEDULE });
        const err = await expectTrpcError(
            ana.caller.appointment.create(appointmentInput(p, { startTime: "19:00", endTime: "19:50" }) as any),
            "CONFLICT"
        );
        expect(err.message).toContain("fora do seu expediente");
        await ana.caller.appointment.create(
            appointmentInput(p, { startTime: "19:00", endTime: "19:50", allowScheduleConflicts: true }) as any
        );
    });

    it("dia é calculado no fuso de São Paulo, não em UTC", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const day = localDate(5);
        const nextDay = localDate(6);
        await createAppointment(ana, p, { date: atLocal(day, "23:30"), startTime: "10:00", endTime: "10:50" });

        const sameDay = await ana.caller.appointment.checkSlot({ date: atLocal(day, "12:00"), startTime: "10:00", endTime: "10:50" });
        expect(sameDay.conflicts.length).toBe(1);

        const following = await ana.caller.appointment.checkSlot({ date: atLocal(nextDay, "00:30"), startTime: "10:00", endTime: "10:50" });
        expect(following.conflicts).toEqual([]);
    });

    it("checkSlot de update sem mudança responde unchanged", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const date = localDate(4);
        const id = await createAppointment(ana, p, { date });
        const result = await ana.caller.appointment.checkSlot({ date, startTime: "10:00", endTime: "10:50", excludeId: id });
        expect(result.unchanged).toBe(true);
    });

    it("update move a sessão sem conflitar com ela mesma", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const id = await createAppointment(ana, p, { startTime: "10:00", endTime: "10:50" });
        await ana.caller.appointment.update({ id, ...appointmentInput(p, { startTime: "10:20", endTime: "11:10" }) } as any);
        const [row] = (await ana.caller.appointment.list()).filter((a) => a.id === id);
        expect(row.startTime).toBe("10:20");
    });
});

describe("agendamento: horários livres", () => {
    it("sem agenda configurada responde configured:false", async () => {
        const ana = await signUp();
        const result = await ana.caller.appointment.freeSlots({ date: localDate(3) });
        expect(result.configured).toBe(false);
        expect(result.slots).toEqual([]);
    });

    it("aplica duração, intervalo e pula sessões existentes", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        await ana.caller.psychologist.updateProfile({ workSchedule: FULL_WEEK_SCHEDULE });
        const date = localDate(3);
        await createAppointment(ana, p, { date, startTime: "10:00", endTime: "10:50" });

        const result = await ana.caller.appointment.freeSlots({ date });
        const starts = result.slots.map((s) => s.start);
        expect(starts.slice(0, 2)).toEqual(["08:00", "09:00"]);
        expect(starts).not.toContain("10:00");
        expect(starts).toContain("11:00");
        expect(result.slots[0].end).toBe("08:50");
    });

    it("dia passado não tem horário livre", async () => {
        const ana = await signUp();
        await ana.caller.psychologist.updateProfile({ workSchedule: FULL_WEEK_SCHEDULE });
        const result = await ana.caller.appointment.freeSlots({ date: localDate(-2) });
        expect(result.slots).toEqual([]);
    });
});

describe("agendamento: cancelamento e persistência", () => {
    it("notas ficam cifradas no banco e legíveis na API", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const id = await createAppointment(ana, p, { notes: "Paciente relatou crise" });
        const [raw] = await rows(sql`select notes from appointment where id = ${id}`);
        expect(raw.notes).toStartWith("v1:");
        const [read] = (await ana.caller.appointment.list()).filter((a) => a.id === id);
        expect(read.notes).toBe("Paciente relatou crise");
    });

    it("cancelar remove a linha e desvincula prontuário e sessão de vídeo", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const id = await createAppointment(ana, p);
        const record = await ana.caller.clinicalRecord.create({ title: "Sessão", patientId: p, appointmentId: id });
        const video = await ana.caller.videoSession.create({ appointmentId: id });

        await ana.caller.appointment.delete({ id });

        expect((await ana.caller.appointment.list()).find((a) => a.id === id)).toBeUndefined();
        expect((await ana.caller.clinicalRecord.getById({ id: record.id }))?.appointmentId).toBeNull();
        expect((await ana.caller.videoSession.get({ id: video.sessionId })).appointmentId).toBeNull();
        const events = await rows<{ type: string }>(sql`select type from event_store where aggregate_id = ${id} order by version`);
        expect(events.map((e) => e.type)).toEqual(["APPOINTMENT_SCHEDULED", "APPOINTMENT_CANCELLED"]);
    });

    it("sessão cancelada não pode ser reagendada nem cancelada de novo", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        const id = await createAppointment(ana, p);
        await ana.caller.appointment.delete({ id });
        await expectRejects(ana.caller.appointment.update({ id, ...appointmentInput(p, { startTime: "15:00", endTime: "15:50" }) } as any));
        await expectRejects(ana.caller.appointment.delete({ id }));
    });
});

describe("agendamento: salas e clínica compartilhada", () => {
    it("sala ocupada por colega é CONFLICT mesmo com allowScheduleConflicts", async () => {
        const ana = await signUp("Ana Dona");
        const bia = await signUp("Bia Colega");
        const { roomId } = await sharedClinic(ana, bia);
        const pa = await createPatient(ana);
        const pb = await createPatient(bia);
        await createAppointment(ana, pa, { roomId, startTime: "10:00", endTime: "10:50" });

        const err = await expectTrpcError(
            bia.caller.appointment.create(
                appointmentInput(pb, { roomId, startTime: "10:20", endTime: "11:10", allowScheduleConflicts: true }) as any
            ),
            "CONFLICT"
        );
        expect(err.message).toContain("Ana Dona");
        await createAppointment(bia, pb, { roomId, startTime: "10:50", endTime: "11:40" });
    });

    it("colega vê a sessão com sala sem dados do paciente; sessão sem sala não aparece", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const { roomId } = await sharedClinic(ana, bia);
        const pa = await createPatient(ana, { nome: "Paciente Secreto" });
        const withRoom = await createAppointment(ana, pa, { roomId, notes: "nota privada", meetingUrl: "https://meet.dev/x" });
        const withoutRoom = await createAppointment(ana, pa, { startTime: "15:00", endTime: "15:50" });

        const seen = await bia.caller.appointment.list();
        const shared = seen.find((a) => a.id === withRoom)!;
        expect(shared.isOwn).toBe(false);
        expect(shared.patient).toBeNull();
        expect(shared.patientId).toBeNull();
        expect(shared.notes).toBeNull();
        expect(shared.meetingUrl).toBeNull();
        expect(shared.roomName).toBe("Sala 1");
        expect(JSON.stringify(seen)).not.toContain("Paciente Secreto");
        expect(seen.find((a) => a.id === withoutRoom)).toBeUndefined();
    });

    it("convite pendente não dá acesso à sala nem à agenda da clínica", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const clinic = await ana.caller.clinic.create({
            name: "C", cnpj: "1", phone: "1", email: "c@c.dev", address: "R", city: "SP",
        });
        const room = await ana.caller.clinic.addRoom({ clinicId: clinic.id, name: "Sala A" });
        await ana.caller.clinic.linkPsychologist({ clinicId: clinic.id, psychologistEmail: bia.email });
        const pa = await createPatient(ana);
        const id = await createAppointment(ana, pa, { roomId: room!.id });
        const pb = await createPatient(bia);

        expect((await bia.caller.appointment.list()).find((a) => a.id === id)).toBeUndefined();
        await expectTrpcError(bia.caller.appointment.create(appointmentInput(pb, { roomId: room!.id }) as any), "FORBIDDEN");
        await expectTrpcError(bia.caller.appointment.checkSlot({ date: localDate(3), startTime: "10:00", endTime: "10:50", clinicId: clinic.id }), "FORBIDDEN");
    });

    it("sala arquivada não aceita novos agendamentos", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const { roomId } = await sharedClinic(ana, bia);
        await ana.caller.clinic.removeRoom({ roomId });
        const pa = await createPatient(ana);
        await expectTrpcError(ana.caller.appointment.create(appointmentInput(pa, { roomId }) as any), "FORBIDDEN");
    });

    it("sessões de membro removido continuam visíveis (sem paciente) e bloqueando a sala", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const { clinicId, roomId } = await sharedClinic(ana, bia);
        const pb = await createPatient(bia);
        const biaSession = await createAppointment(bia, pb, { roomId, startTime: "09:00", endTime: "09:50" });

        await ana.caller.clinic.unlinkPsychologist({ clinicId, psychologistId: bia.id });

        const stillSeen = (await ana.caller.appointment.list()).find((a) => a.id === biaSession);
        expect(stillSeen?.isOwn).toBe(false);
        expect(stillSeen?.patient).toBeNull();
        expect((await bia.caller.appointment.list()).filter((a) => !a.isOwn)).toEqual([]);
        const pa = await createPatient(ana);
        await expectTrpcError(
            ana.caller.appointment.create(appointmentInput(pa, { roomId, startTime: "09:00", endTime: "09:50" }) as any),
            "CONFLICT"
        );
    });

    it("freeSlots por clínica só oferece horários com sala livre", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const { clinicId, roomId } = await sharedClinic(ana, bia);
        await ana.caller.psychologist.updateProfile({ workSchedule: FULL_WEEK_SCHEDULE });
        const pb = await createPatient(bia);
        const date = localDate(3);
        await createAppointment(bia, pb, { date, roomId, startTime: "08:00", endTime: "08:50" });

        const result = await ana.caller.appointment.freeSlots({ date, clinicId });
        expect(result.roomsConsidered).toBe(true);
        expect(result.slots.map((s) => s.start)).not.toContain("08:00");
        expect(result.slots[0].rooms.map((r) => r.id)).toEqual([roomId]);
    });
});
