import { eq } from "drizzle-orm";
import { db } from "../../db";
import { user } from "../../db/schema";
import { cqrsEventStore, eventBus } from "../../lib/cqrs";
import { PsychologistAggregate } from "./psychologist.aggregate";

export interface UpdatePsychologistProfileCommand {
    id: string;
    name?: string;
    phone?: string;
    crp?: string;
    city?: string;
    image?: string;
}

export const psychologistCommands = {
    /**
     * Handles updating the profile of a psychologist.
     */
    async updateProfile(command: UpdatePsychologistProfileCommand): Promise<void> {
        // 1. Get current snapshot from DB or past event history
        const [existingUser] = await db.select().from(user).where(eq(user.id, command.id));
        if (!existingUser) {
            throw new Error(`Psychologist with ID ${command.id} not found`);
        }

        const history = await cqrsEventStore.getEvents(command.id);
        const aggregate = new PsychologistAggregate(command.id);

        // Initialize aggregate state from current DB baseline (to support transition to ES seamlessly)
        aggregate.initialize({
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            phone: existingUser.phone,
            crp: existingUser.crp,
            city: existingUser.city,
            image: existingUser.image,
        });

        // Replay any events that occurred on top of this aggregate
        aggregate.loadFromHistory(history);

        const expectedVersion = aggregate.version;

        // 2. Perform command business logic
        aggregate.updateProfile({
            name: command.name,
            phone: command.phone,
            crp: command.crp,
            city: command.city,
            image: command.image,
        });

        // 3. Save uncommitted events
        await cqrsEventStore.saveEvents(command.id, expectedVersion, aggregate.uncommittedEvents);

        // 4. Publish events to update read models
        await eventBus.publishAll(aggregate.uncommittedEvents);

        aggregate.clearUncommittedEvents();
    },
};
