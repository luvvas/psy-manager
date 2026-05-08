import { cqrsEventStore, eventBus } from "../../lib/cqrs";
import { AppointmentAggregate } from "./appointment.aggregate";

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
    googleEventId?: string;
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
    googleEventId?: string;
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
            googleEventId: command.googleEventId,
        });

        await cqrsEventStore.saveEvents(id, 0, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();

        return id;
    },

    async reschedule(command: RescheduleAppointmentCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw new Error(`Appointment with ID ${command.id} not found`);
        }

        const aggregate = new AppointmentAggregate();
        aggregate.loadFromHistory(history);

        if (aggregate.state.psychologistId !== command.psychologistId) {
            throw new Error("Unauthorized: You do not own this appointment");
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
            googleEventId: command.googleEventId,
        });

        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },

    async cancel(command: CancelAppointmentCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw new Error(`Appointment with ID ${command.id} not found`);
        }

        const aggregate = new AppointmentAggregate();
        aggregate.loadFromHistory(history);

        if (aggregate.state.psychologistId !== command.psychologistId) {
            throw new Error("Unauthorized: You do not own this appointment");
        }

        const expectedVersion = aggregate.version;

        aggregate.cancel();

        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },
};
