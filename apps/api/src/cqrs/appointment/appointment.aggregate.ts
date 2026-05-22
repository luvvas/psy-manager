import { AggregateRoot } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";

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
    }): void {
        if (this._state.isDeleted) {
            throw new Error("Cannot modify a deleted appointment");
        }
        this.raise("APPOINTMENT_RESCHEDULED", data);
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
                    updatedAt: event.createdAt ?? new Date(),
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
