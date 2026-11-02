import { cqrsEventStore, eventBus } from "../../lib/cqrs";
import { AppointmentAggregate } from "./appointment.aggregate";
import { TRPCError } from "@trpc/server";

// "Doesn't exist" and "belongs to someone else" get the same answer, so the
// response does not reveal which IDs exist in other accounts (audit F7).
const notFound = () => new TRPCError({ code: "NOT_FOUND", message: "Agendamento não encontrado." });

export interface ScheduleAppointmentCommand {
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
}

export interface RescheduleAppointmentCommand {
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
}

export interface CancelAppointmentCommand {
    id: string;
    psychologistId: string;
}

export const appointmentCommands = {
    async schedule(command: ScheduleAppointmentCommand): Promise<string> {
        const id = crypto.randomUUID();
        const aggregate = new AppointmentAggregate();

        aggregate.schedule({
            id,
            psychologistId: command.psychologistId,
            patientId: command.patientId,
            date: command.date,
            startTime: command.startTime,
            endTime: command.endTime,
            status: command.status,
            sessionType: command.sessionType,
            type: command.type,
            isRecurring: command.isRecurring,
            notes: command.notes,
            meetingUrl: command.meetingUrl,
            googleEventId: command.googleEventId,
            clinicId: command.clinicId ?? null,
            roomId: command.roomId ?? null,
            reminderEnabled: command.reminderEnabled,
            reminderMinutesBefore: command.reminderMinutesBefore,
        });

        await cqrsEventStore.saveEvents(id, 0, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();

        return id;
    },

    async reschedule(command: RescheduleAppointmentCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw notFound();
        }

        const aggregate = new AppointmentAggregate();
        aggregate.loadFromHistory(history);

        if (aggregate.state.psychologistId !== command.psychologistId) {
            throw notFound();
        }

        const expectedVersion = aggregate.version;

        aggregate.reschedule({
            patientId: command.patientId,
            date: command.date,
            startTime: command.startTime,
            endTime: command.endTime,
            status: command.status,
            sessionType: command.sessionType,
            type: command.type,
            isRecurring: command.isRecurring,
            notes: command.notes,
            meetingUrl: command.meetingUrl,
            googleEventId: command.googleEventId,
            clinicId: command.clinicId ?? null,
            roomId: command.roomId ?? null,
            reminderEnabled: command.reminderEnabled,
            reminderMinutesBefore: command.reminderMinutesBefore,
        });

        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },

    async cancel(command: CancelAppointmentCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw notFound();
        }

        const aggregate = new AppointmentAggregate();
        aggregate.loadFromHistory(history);

        if (aggregate.state.psychologistId !== command.psychologistId) {
            throw notFound();
        }

        const expectedVersion = aggregate.version;

        aggregate.cancel();

        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },
};
