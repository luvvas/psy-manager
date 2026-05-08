import { eq } from "drizzle-orm";
import { db } from "../../db";
import { user } from "../../db/schema";
import { eventBus } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";

export const psychologistProjections = {
    init() {
        eventBus.subscribe("PSYCHOLOGIST_PROFILE_UPDATED", this.handleProfileUpdated);
        console.log("📈 Psychologist Projections subscribed to EventBus");
    },

    async handleProfileUpdated(event: DomainEvent): Promise<void> {
        const id = event.aggregateId;
        const { name, phone, crp, city, image } = event.data;

        await db
            .update(user)
            .set({
                name,
                phone,
                crp,
                city,
                image,
                updatedAt: event.createdAt ?? new Date(),
            })
            .where(eq(user.id, id));

        console.log(`📈 Read Model Projected: Psychologist Updated -> (${id})`);
    },
};
