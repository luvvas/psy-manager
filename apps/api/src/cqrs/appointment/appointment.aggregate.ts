import { AggregateRoot } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";
import { localDay } from "../../lib/work-schedule";

export interface AppointmentState {
    id: string;
    psychologistId: string;
    patientId: string;
    date: Date | null;
    startTime: string;
    endTime: string;
    status: string;
    sessionType: string;
    type: string;
    isRecurring: boolean;
    notes: string | null;
    meetingUrl: string | null;
    googleEventId: string | null;
    clinicId: string | null;
    roomId: string | null;
    reminderEnabled: boolean;
    reminderMinutesBefore: number | null;
    reminderSentAt: Date | null;
    isDeleted: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export class AppointmentAggregate extends AggregateRoot<AppointmentState> {
    public readonly aggregateType = "appointment";

    protected getInitialState(): AppointmentState {
        return {
            id: "",
            psychologistId: "",
            patientId: "",
            date: null,
            startTime: "",
            endTime: "",
            status: "pending",
            sessionType: "online",
            type: "individual",
            isRecurring: false,
            notes: null,
            meetingUrl: null,
            googleEventId: null,
            clinicId: null,
            roomId: null,
            reminderEnabled: false,
            reminderMinutesBefore: null,
            reminderSentAt: null,
            isDeleted: false,
            createdAt: null,
            updatedAt: null,
        };
    }

    public schedule(data: {
        id: string;
        psychologistId: string;
        patientId: string;
        date: Date;
        startTime: string;
        endTime: string;
        status: string;
        sessionType: string;
        type: string;
        isRecurring: boolean;
        notes?: string;
        meetingUrl?: string;
        googleEventId?: string;
        clinicId?: string | null;
        roomId?: string | null;
        reminderEnabled?: boolean;
        reminderMinutesBefore?: number;
    }): void {
        if (this._version > 0) {
            throw new Error("Appointment already exists");
        }
        this._id = data.id;
        this.raise("APPOINTMENT_SCHEDULED", data);
    }

    public reschedule(data: {
        patientId: string;
        date: Date;
        startTime: string;
        endTime: string;
        status: string;
        sessionType: string;
        type: string;
        isRecurring: boolean;
        notes?: string;
        meetingUrl?: string;
        googleEventId?: string;
        clinicId?: string | null;
        roomId?: string | null;
        reminderEnabled?: boolean;
        reminderMinutesBefore?: number;
    }): void {
        if (this._state.isDeleted) {
            throw new Error("Cannot modify a deleted appointment");
        }
        const resetReminder = !this.isSameSlot(data.date, data.startTime) || data.patientId !== this._state.patientId;
        this.raise("APPOINTMENT_RESCHEDULED", { ...data, resetReminder });
    }

    public markReminderSent(data: { sentAt: Date; date: Date; startTime: string }): void {
        this.assertReminderSendable(data);
        this.raise("APPOINTMENT_REMINDER_SENT", data);
    }

    public assertReminderSendable(data: { date: Date; startTime: string }): void {
        if (this._state.isDeleted || this._state.status === "cancelled") {
            throw new Error("Cannot send a reminder for a deleted or cancelled appointment");
        }
        if (!this._state.reminderEnabled) {
            throw new Error("Reminder is disabled for this appointment");
        }
        if (this._state.reminderSentAt) {
            throw new Error("Reminder already sent");
        }
        if (!this.isSameSlot(data.date, data.startTime)) {
            throw new Error("Appointment was rescheduled after the reminder was picked");
        }
    }

    private isSameSlot(date: Date, startTime: string): boolean {
        if (!this._state.date) return false;
        return this._state.startTime === startTime && localDay(this._state.date).key === localDay(new Date(date)).key;
    }

    public cancel(): void {
        if (this._state.isDeleted) {
            throw new Error("Appointment is already deleted");
        }
        this.raise("APPOINTMENT_CANCELLED", {});
    }

    protected applyEvent(state: AppointmentState, event: DomainEvent): AppointmentState {
        switch (event.type) {
            case "APPOINTMENT_SCHEDULED":
                return {
                    ...state,
                    id: event.data.id,
                    psychologistId: event.data.psychologistId,
                    patientId: event.data.patientId,
                    date: new Date(event.data.date),
                    startTime: event.data.startTime,
                    endTime: event.data.endTime,
                    status: event.data.status,
                    sessionType: event.data.sessionType,
                    type: event.data.type,
                    isRecurring: event.data.isRecurring,
                    notes: event.data.notes ?? null,
                    meetingUrl: event.data.meetingUrl ?? null,
                    googleEventId: event.data.googleEventId ?? null,
                    clinicId: event.data.clinicId ?? null,
                    roomId: event.data.roomId ?? null,
                    reminderEnabled: event.data.reminderEnabled ?? false,
                    reminderMinutesBefore: event.data.reminderMinutesBefore ?? null,
                    reminderSentAt: null,
                    isDeleted: false,
                    createdAt: event.createdAt ?? new Date(),
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "APPOINTMENT_RESCHEDULED":
                return {
                    ...state,
                    patientId: event.data.patientId,
                    date: new Date(event.data.date),
                    startTime: event.data.startTime,
                    endTime: event.data.endTime,
                    status: event.data.status,
                    sessionType: event.data.sessionType,
                    type: event.data.type,
                    isRecurring: event.data.isRecurring,
                    notes: event.data.notes ?? null,
                    meetingUrl: event.data.meetingUrl ?? null,
                    googleEventId: event.data.googleEventId ?? state.googleEventId,
                    clinicId: event.data.clinicId ?? null,
                    roomId: event.data.roomId ?? null,
                    reminderEnabled: event.data.reminderEnabled ?? false,
                    reminderMinutesBefore: event.data.reminderMinutesBefore ?? null,
                    reminderSentAt: event.data.resetReminder ? null : state.reminderSentAt,
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "APPOINTMENT_REMINDER_SENT":
                return {
                    ...state,
                    reminderSentAt: new Date(event.data.sentAt),
                };

            case "APPOINTMENT_CANCELLED":
                return {
                    ...state,
                    isDeleted: true,
                    updatedAt: event.createdAt ?? new Date(),
                };

            default:
                return state;
        }
    }
}
