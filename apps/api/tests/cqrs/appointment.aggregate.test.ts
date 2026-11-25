/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { AppointmentAggregate } from "../../src/cqrs/appointment/appointment.aggregate";

function baseData() {
    return {
        id: "appt-1",
        psychologistId: "psych-1",
        patientId: "patient-1",
        date: new Date("2026-06-01"),
        startTime: "09:00",
        endTime: "10:00",
        status: "confirmed",
        sessionType: "online",
        type: "individual",
        isRecurring: false,
    };
}

describe("AppointmentAggregate", () => {
    test("raises APPOINTMENT_SCHEDULED and reflects state after schedule", () => {
        const agg = new AppointmentAggregate();
        agg.schedule(baseData());

        expect(agg.uncommittedEvents).toHaveLength(1);
        const event = agg.uncommittedEvents[0];
        expect(event.type).toBe("APPOINTMENT_SCHEDULED");
        expect(event.version).toBe(1);
        expect(event.aggregateId).toBe("appt-1");
        expect(agg.state.psychologistId).toBe("psych-1");
        expect(agg.state.patientId).toBe("patient-1");
        expect(agg.state.isDeleted).toBe(false);
        expect(agg.version).toBe(1);
    });

    test("raises APPOINTMENT_RESCHEDULED and updates time fields", () => {
        const agg = new AppointmentAggregate();
        agg.schedule(baseData());
        agg.clearUncommittedEvents();

        agg.reschedule({ ...baseData(), startTime: "10:00", endTime: "11:00" });

        expect(agg.uncommittedEvents).toHaveLength(1);
        expect(agg.uncommittedEvents[0].type).toBe("APPOINTMENT_RESCHEDULED");
        expect(agg.state.startTime).toBe("10:00");
        expect(agg.state.endTime).toBe("11:00");
        expect(agg.version).toBe(2);
    });

    test("raises APPOINTMENT_CANCELLED and sets isDeleted", () => {
        const agg = new AppointmentAggregate();
        agg.schedule(baseData());
        agg.clearUncommittedEvents();
        agg.cancel();

        expect(agg.uncommittedEvents[0].type).toBe("APPOINTMENT_CANCELLED");
        expect(agg.state.isDeleted).toBe(true);
        expect(agg.version).toBe(2);
    });

    test("rebuilds state from history via loadFromHistory", () => {
        const source = new AppointmentAggregate();
        source.schedule(baseData());
        source.reschedule({ ...baseData(), notes: "Updated note" });
        const events = [...source.uncommittedEvents];

        const replayed = new AppointmentAggregate();
        replayed.loadFromHistory(events);

        expect(replayed.state.notes).toBe("Updated note");
        expect(replayed.state.isDeleted).toBe(false);
        expect(replayed.version).toBe(2);
        expect(replayed.uncommittedEvents).toHaveLength(0);
    });

    test("rebuilds cancelled state from history", () => {
        const source = new AppointmentAggregate();
        source.schedule(baseData());
        source.cancel();
        const events = [...source.uncommittedEvents];

        const replayed = new AppointmentAggregate();
        replayed.loadFromHistory(events);

        expect(replayed.state.isDeleted).toBe(true);
        expect(replayed.version).toBe(2);
    });

    test("version is preserved after clearUncommittedEvents", () => {
        const agg = new AppointmentAggregate();
        agg.schedule(baseData());
        agg.clearUncommittedEvents();

        expect(agg.uncommittedEvents).toHaveLength(0);
        expect(agg.version).toBe(1);
    });

    test("rejects scheduling an already initialized appointment", () => {
        const agg = new AppointmentAggregate();
        agg.schedule(baseData());
        expect(() => agg.schedule(baseData())).toThrow("already exists");
    });

    test("rejects reschedule on a cancelled appointment", () => {
        const agg = new AppointmentAggregate();
        agg.schedule(baseData());
        agg.cancel();
        expect(() => agg.reschedule(baseData())).toThrow("deleted");
    });

    test("rejects double cancel", () => {
        const agg = new AppointmentAggregate();
        agg.schedule(baseData());
        agg.cancel();
        expect(() => agg.cancel()).toThrow("already deleted");
    });

    test("notes defaults to null when not provided on schedule", () => {
        const agg = new AppointmentAggregate();
        agg.schedule(baseData());
        expect(agg.state.notes).toBeNull();
    });

    test("googleEventId is preserved across reschedule when not explicitly changed", () => {
        const agg = new AppointmentAggregate();
        agg.schedule({ ...baseData(), googleEventId: "gcal-event-1" });
        agg.clearUncommittedEvents();
        agg.reschedule(baseData());

        expect(agg.state.googleEventId).toBe("gcal-event-1");
    });

    test("date is stored as a Date instance after replay", () => {
        const source = new AppointmentAggregate();
        source.schedule(baseData());
        const events = [...source.uncommittedEvents];

        const replayed = new AppointmentAggregate();
        replayed.loadFromHistory(events);

        expect(replayed.state.date).toBeInstanceOf(Date);
    });
});

describe("AppointmentAggregate: lembrete", () => {
    const slot = { date: baseData().date, startTime: "09:00" };

    function withReminder() {
        const agg = new AppointmentAggregate();
        agg.schedule({ ...baseData(), reminderEnabled: true, reminderMinutesBefore: 60 });
        agg.clearUncommittedEvents();
        return agg;
    }

    test("markReminderSent registra o envio e não aceita um segundo", () => {
        const agg = withReminder();
        const sentAt = new Date("2026-06-01T08:00:00Z");
        agg.markReminderSent({ sentAt, ...slot });

        expect(agg.uncommittedEvents[0].type).toBe("APPOINTMENT_REMINDER_SENT");
        expect(agg.state.reminderSentAt?.toISOString()).toBe(sentAt.toISOString());
        expect(() => agg.markReminderSent({ sentAt, ...slot })).toThrow("already sent");
    });

    test("markReminderSent recusa outro horário, lembrete desligado e agendamento cancelado", () => {
        const agg = withReminder();
        expect(() => agg.markReminderSent({ sentAt: new Date(), ...slot, startTime: "08:00" })).toThrow("rescheduled");

        const off = new AppointmentAggregate();
        off.schedule(baseData());
        expect(() => off.markReminderSent({ sentAt: new Date(), ...slot })).toThrow("disabled");

        agg.cancel();
        expect(() => agg.markReminderSent({ sentAt: new Date(), ...slot })).toThrow("deleted");
    });

    test("remarcar para outro horário zera o envio; mudar só o fim mantém", () => {
        const agg = withReminder();
        agg.markReminderSent({ sentAt: new Date(), ...slot });

        agg.reschedule({ ...baseData(), endTime: "10:30", reminderEnabled: true, reminderMinutesBefore: 60 });
        expect(agg.uncommittedEvents.at(-1)!.data.resetReminder).toBe(false);
        expect(agg.state.reminderSentAt).not.toBeNull();

        agg.reschedule({ ...baseData(), startTime: "11:00", endTime: "12:00", reminderEnabled: true, reminderMinutesBefore: 60 });
        expect(agg.uncommittedEvents.at(-1)!.data.resetReminder).toBe(true);
        expect(agg.state.reminderSentAt).toBeNull();
    });

    test("trocar o paciente zera o envio e status cancelado bloqueia o lembrete", () => {
        const agg = withReminder();
        agg.markReminderSent({ sentAt: new Date(), ...slot });

        agg.reschedule({ ...baseData(), patientId: "patient-2", reminderEnabled: true, reminderMinutesBefore: 60 });
        expect(agg.state.reminderSentAt).toBeNull();

        agg.reschedule({ ...baseData(), patientId: "patient-2", status: "cancelled", reminderEnabled: true });
        expect(() => agg.assertReminderSendable(slot)).toThrow("deleted or cancelled");
    });

    test("loadFromHistory reconstrói o envio do lembrete", () => {
        const source = new AppointmentAggregate();
        source.schedule({ ...baseData(), reminderEnabled: true, reminderMinutesBefore: 60 });
        source.markReminderSent({ sentAt: new Date("2026-06-01T08:00:00Z"), ...slot });

        const replayed = new AppointmentAggregate();
        replayed.loadFromHistory(source.uncommittedEvents);

        expect(replayed.state.reminderSentAt?.toISOString()).toBe("2026-06-01T08:00:00.000Z");
        expect(replayed.version).toBe(2);
    });
});
