/// <reference types="bun" />

import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { sql } from "drizzle-orm";
import { emailService, type SessionReminderEmail } from "../src/services/email.service";
import { REMINDER_LOCK_KEY, sessionReminderService } from "../src/services/session-reminder.service";
import { localDateTime } from "../src/lib/work-schedule";
import {
    appointmentInput,
    createAppointment,
    createPatient,
    db,
    localDate,
    signUp,
    uniqueEmail,
    type TestUser,
} from "./setup/helpers";

const MINUTE = 60_000;

let dayOffset = 20;

function nextDay() {
    dayOffset++;
    return localDate(dayOffset);
}

async function reminderSentAt(id: string): Promise<Date | null> {
    const [row] = (await db.execute(
        sql`select reminder_sent_at from appointment where id = ${id}`
    )) as unknown as { reminder_sent_at: Date | null }[];
    return row?.reminder_sent_at ?? null;
}

async function reminderEvents(id: string): Promise<number> {
    const [row] = (await db.execute(
        sql`select count(*)::int as total from event_store where aggregate_id = ${id} and type = 'APPOINTMENT_REMINDER_SENT'`
    )) as unknown as { total: number }[];
    return row.total;
}

async function setup(options: { email?: string | null; minutesBefore?: number; enabled?: boolean; overrides?: Record<string, unknown> } = {}) {
    const ana = await signUp("Ana Lembrete");
    const email = options.email === undefined ? uniqueEmail("paciente") : options.email;
    const patientId = await createPatient(ana, email ? { email } : {});
    const date = nextDay();
    const id = await createAppointment(ana, patientId, {
        date,
        startTime: "10:00",
        endTime: "10:50",
        reminderEnabled: options.enabled ?? true,
        reminderMinutesBefore: options.minutesBefore ?? 60,
        ...options.overrides,
    });
    return { ana, patientId, id, email, date, startsAt: localDateTime(date, "10:00") };
}

type SendImpl = (reminder: SessionReminderEmail) => Promise<"sent" | "not_configured">;

function stubSend(impl: SendImpl = async () => "sent") {
    return spyOn(emailService, "sendSessionReminder").mockImplementation(impl);
}

function callsTo(spy: ReturnType<typeof stubSend>, email: string | null) {
    return spy.mock.calls.filter(([reminder]) => reminder.to === email);
}

async function rescheduleTo(ana: TestUser, id: string, patientId: string, overrides: Record<string, unknown>) {
    await ana.caller.appointment.update({
        id,
        ...appointmentInput(patientId, {
            reminderEnabled: true,
            reminderMinutesBefore: 60,
            ...overrides,
        }),
    } as any);
}

afterEach(() => {
    (emailService.sendSessionReminder as unknown as { mockRestore?: () => void }).mockRestore?.();
});

describe("lembrete de sessão por e-mail", () => {
    it("envia uma vez só, com dados não clínicos, e registra pelo evento", async () => {
        const { id, email, startsAt } = await setup({
            overrides: { sessionType: "online", meetingUrl: "https://meet.example.com/abc", notes: "observação clínica" },
        });
        const spy = stubSend();

        const first = await sessionReminderService.runCycle(new Date(startsAt.getTime() - 30 * MINUTE));
        expect(first.locked).toBe(true);
        const calls = callsTo(spy, email);
        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toEqual({
            to: email!,
            psychologistName: "Ana Lembrete",
            startsAt,
            sessionType: "online",
            meetingUrl: "https://meet.example.com/abc",
        });
        expect(await reminderSentAt(id)).not.toBeNull();
        expect(await reminderEvents(id)).toBe(1);

        await sessionReminderService.runCycle(new Date(startsAt.getTime() - 20 * MINUTE));
        expect(callsTo(spy, email)).toHaveLength(1);
        expect(await reminderEvents(id)).toBe(1);
    });

    it("não reenvia quando o evento já registrou o envio, mesmo com a projeção atrasada", async () => {
        const { id, email, startsAt } = await setup();
        const spy = stubSend();
        await sessionReminderService.runCycle(new Date(startsAt.getTime() - 30 * MINUTE));
        expect(callsTo(spy, email)).toHaveLength(1);

        await db.execute(sql`update appointment set reminder_sent_at = null where id = ${id}`);
        const result = await sessionReminderService.runCycle(new Date(startsAt.getTime() - 29 * MINUTE));
        expect(result.skipped).toBeGreaterThanOrEqual(1);
        expect(callsTo(spy, email)).toHaveLength(1);
        expect(await reminderEvents(id)).toBe(1);
    });

    it("respeita a janela: nem antes da antecedência nem depois do início", async () => {
        const { id, email, startsAt } = await setup({ minutesBefore: 1440 });
        const spy = stubSend();

        await sessionReminderService.runCycle(new Date(startsAt.getTime() - 1441 * MINUTE));
        await sessionReminderService.runCycle(startsAt);
        await sessionReminderService.runCycle(new Date(startsAt.getTime() + 5 * MINUTE));
        expect(callsTo(spy, email)).toHaveLength(0);
        expect(await reminderSentAt(id)).toBeNull();

        await sessionReminderService.runCycle(new Date(startsAt.getTime() - 1440 * MINUTE));
        expect(callsTo(spy, email)).toHaveLength(1);
        expect(await reminderSentAt(id)).not.toBeNull();
    });

    it("pula paciente sem e-mail sem erro e sem marcar", async () => {
        const { id, startsAt } = await setup({ email: null });
        const spy = stubSend();

        const result = await sessionReminderService.runCycle(new Date(startsAt.getTime() - 30 * MINUTE));
        expect(result.withoutEmail).toBeGreaterThanOrEqual(1);
        expect(spy.mock.calls.some(([r]) => !r.to)).toBe(false);
        expect(await reminderSentAt(id)).toBeNull();
    });

    it("não marca quando o SMTP falha e tenta de novo no ciclo seguinte", async () => {
        const { id, email, startsAt } = await setup();
        const failing = stubSend(async () => {
            throw new Error("SMTP fora do ar");
        });

        const result = await sessionReminderService.runCycle(new Date(startsAt.getTime() - 30 * MINUTE));
        expect(result.failed).toBeGreaterThanOrEqual(1);
        expect(callsTo(failing, email)).toHaveLength(1);
        expect(await reminderSentAt(id)).toBeNull();
        failing.mockRestore();

        const working = stubSend();
        await sessionReminderService.runCycle(new Date(startsAt.getTime() - 29 * MINUTE));
        expect(callsTo(working, email)).toHaveLength(1);
        expect(await reminderSentAt(id)).not.toBeNull();
    });

    it("sem SMTP configurado não conta como enviado", async () => {
        const { id, startsAt } = await setup();
        expect(emailService.isConfigured()).toBe(false);

        const result = await sessionReminderService.runCycle(new Date(startsAt.getTime() - 30 * MINUTE));
        expect(result.notConfigured).toBeGreaterThanOrEqual(1);
        expect(await reminderSentAt(id)).toBeNull();
        expect(await reminderEvents(id)).toBe(0);
    });

    it("o advisory lock impede execução dupla", async () => {
        const { id, email, startsAt } = await setup();
        const now = new Date(startsAt.getTime() - 30 * MINUTE);

        await db.transaction(async (tx) => {
            await tx.execute(sql`select pg_advisory_xact_lock(${REMINDER_LOCK_KEY})`);
            const blocked = await sessionReminderService.runCycle(now);
            expect(blocked.locked).toBe(false);
        });
        expect(await reminderSentAt(id)).toBeNull();

        let release!: () => void;
        const gate = new Promise<void>((resolve) => (release = resolve));
        const spy = stubSend(async () => {
            await gate;
            return "sent";
        });
        const first = sessionReminderService.runCycle(now);
        await new Promise((resolve) => setTimeout(resolve, 200));
        const second = await sessionReminderService.runCycle(now);
        release();
        const done = await first;

        expect(done.locked).toBe(true);
        expect(second.locked).toBe(false);
        expect(callsTo(spy, email)).toHaveLength(1);
        expect(await reminderEvents(id)).toBe(1);
    });

    it("lembrete desligado, agendamento cancelado ou com status cancelado não recebem lembrete", async () => {
        const off = await setup({ enabled: false });
        const deleted = await setup();
        await deleted.ana.caller.appointment.delete({ id: deleted.id });
        const cancelled = await setup();
        await rescheduleTo(cancelled.ana, cancelled.id, cancelled.patientId, {
            date: cancelled.date,
            status: "cancelled",
        });
        const spy = stubSend();

        for (const item of [off, deleted, cancelled]) {
            await sessionReminderService.runCycle(new Date(item.startsAt.getTime() - 30 * MINUTE));
            expect(callsTo(spy, item.email)).toHaveLength(0);
        }
        expect(await reminderSentAt(cancelled.id)).toBeNull();
    });

    it("remarcado não recebe lembrete do horário antigo e recebe do novo", async () => {
        const { ana, id, patientId, email, date, startsAt } = await setup();
        await rescheduleTo(ana, id, patientId, { date, startTime: "15:00", endTime: "15:50" });
        const spy = stubSend();

        await sessionReminderService.runCycle(new Date(startsAt.getTime() - 30 * MINUTE));
        expect(callsTo(spy, email)).toHaveLength(0);

        const newStart = localDateTime(date, "15:00");
        await sessionReminderService.runCycle(new Date(newStart.getTime() - 30 * MINUTE));
        expect(callsTo(spy, email)).toHaveLength(1);
        expect(callsTo(spy, email)[0][0].startsAt).toEqual(newStart);
    });

    it("remarcar depois do envio libera um novo lembrete para o novo horário", async () => {
        const { ana, id, patientId, email, date, startsAt } = await setup();
        const spy = stubSend();
        await sessionReminderService.runCycle(new Date(startsAt.getTime() - 30 * MINUTE));
        expect(await reminderSentAt(id)).not.toBeNull();

        await rescheduleTo(ana, id, patientId, { date, startTime: "10:00", endTime: "11:00" });
        expect(await reminderSentAt(id)).not.toBeNull();

        await rescheduleTo(ana, id, patientId, { date, startTime: "16:00", endTime: "16:50" });
        expect(await reminderSentAt(id)).toBeNull();

        const newStart = localDateTime(date, "16:00");
        await sessionReminderService.runCycle(new Date(newStart.getTime() - 30 * MINUTE));
        expect(callsTo(spy, email)).toHaveLength(2);
        expect(await reminderEvents(id)).toBe(2);
    });
});
