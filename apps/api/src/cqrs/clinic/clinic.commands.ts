import { eq } from "drizzle-orm";
import { db } from "../../db";
import { user } from "../../db/schema";
import { cqrsEventStore, eventBus } from "../../lib/cqrs";
import { ClinicAggregate } from "./clinic.aggregate";

export interface CreateClinicCommand {
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    psychologistId: string;
}

export interface UpdateClinicCommand {
    id: string;
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    psychologistId: string;
}

export interface DeleteClinicCommand {
    id: string;
    psychologistId: string;
}

export interface LinkPsychologistCommand {
    clinicId: string;
    psychologistEmail: string;
}

export interface UnlinkPsychologistCommand {
    clinicId: string;
    psychologistId: string;
}

export const clinicCommands = {
    async create(command: CreateClinicCommand): Promise<string> {
        const id = crypto.randomUUID();
        const aggregate = new ClinicAggregate();

        aggregate.create({
            id,
            name: command.name,
            cnpj: command.cnpj,
            phone: command.phone,
            email: command.email,
            address: command.address,
            city: command.city,
            createdById: command.psychologistId,
        });

        await cqrsEventStore.saveEvents(id, 0, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();

        return id;
    },

    async update(command: UpdateClinicCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw new Error(`Clinic with ID ${command.id} not found`);
        }

        const aggregate = new ClinicAggregate();
        aggregate.loadFromHistory(history);

        if (aggregate.state.createdById !== command.psychologistId) {
            throw new Error("Unauthorized: You do not own this clinic");
        }

        const expectedVersion = aggregate.version;

        aggregate.update({
            name: command.name,
            cnpj: command.cnpj,
            phone: command.phone,
            email: command.email,
            address: command.address,
            city: command.city,
        });

        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },

    async delete(command: DeleteClinicCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.id);
        if (history.length === 0) {
            throw new Error(`Clinic with ID ${command.id} not found`);
        }

        const aggregate = new ClinicAggregate();
        aggregate.loadFromHistory(history);

        if (aggregate.state.createdById !== command.psychologistId) {
            throw new Error("Unauthorized: You do not own this clinic");
        }

        const expectedVersion = aggregate.version;

        aggregate.delete();

        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },

    async linkPsychologist(command: LinkPsychologistCommand): Promise<void> {
        const [targetUser] = await db
            .select()
            .from(user)
            .where(eq(user.email, command.psychologistEmail));

        if (!targetUser) {
            throw new Error("Psicólogo com este e-mail não encontrado");
        }

        const history = await cqrsEventStore.getEvents(command.clinicId);
        if (history.length === 0) {
            throw new Error(`Clinic with ID ${command.clinicId} not found`);
        }

        const aggregate = new ClinicAggregate();
        aggregate.loadFromHistory(history);

        const expectedVersion = aggregate.version;

        aggregate.linkPsychologist(targetUser.id);

        await cqrsEventStore.saveEvents(command.clinicId, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },

    async unlinkPsychologist(command: UnlinkPsychologistCommand): Promise<void> {
        const history = await cqrsEventStore.getEvents(command.clinicId);
        if (history.length === 0) {
            throw new Error(`Clinic with ID ${command.clinicId} not found`);
        }

        const aggregate = new ClinicAggregate();
        aggregate.loadFromHistory(history);

        const expectedVersion = aggregate.version;

        aggregate.unlinkPsychologist(command.psychologistId);

        await cqrsEventStore.saveEvents(command.clinicId, expectedVersion, aggregate.uncommittedEvents);
        await eventBus.publishAll(aggregate.uncommittedEvents);
        aggregate.clearUncommittedEvents();
    },
};
