import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { clinic, psychologistClinic } from "../../db/schema";
import { eventBus } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";

export const clinicProjections = {
    init() {
        eventBus.subscribe("CLINIC_CREATED", this.handleClinicCreated);
        eventBus.subscribe("CLINIC_UPDATED", this.handleClinicUpdated);
        eventBus.subscribe("CLINIC_DELETED", this.handleClinicDeleted);
        eventBus.subscribe("PSYCHOLOGIST_LINKED_TO_CLINIC", this.handlePsychologistLinked);
        eventBus.subscribe("PSYCHOLOGIST_UNLINKED_FROM_CLINIC", this.handlePsychologistUnlinked);
        console.log("📈 Clinic Projections subscribed to EventBus");
    },

    async handleClinicCreated(event: DomainEvent): Promise<void> {
        const { id, name, cnpj, phone, email, address, city, createdById } = event.data;

        await db.insert(clinic).values({
            id,
            name,
            cnpj,
            phone,
            email,
            address,
            city,
            createdById,
            createdAt: event.createdAt ?? new Date(),
            updatedAt: event.createdAt ?? new Date(),
        });

        // Auto-link the creator psychologist to the clinic
        await db.insert(psychologistClinic).values({
            id: crypto.randomUUID(),
            clinicId: id,
            psychologistId: createdById,
            createdAt: event.createdAt ?? new Date(),
            updatedAt: event.createdAt ?? new Date(),
        });

        console.log(`📈 Read Model Projected: Clinic Created & Psychologist Linked -> ${name} (${id})`);
    },

    async handleClinicUpdated(event: DomainEvent): Promise<void> {
        const { name, cnpj, phone, email, address, city } = event.data;
        const id = event.aggregateId;

        await db
            .update(clinic)
            .set({
                name,
                cnpj,
                phone,
                email,
                address,
                city,
                updatedAt: event.createdAt ?? new Date(),
            })
            .where(eq(clinic.id, id));

        console.log(`📈 Read Model Projected: Clinic Updated -> ${name} (${id})`);
    },

    async handleClinicDeleted(event: DomainEvent): Promise<void> {
        const id = event.aggregateId;

        // Clean up links and delete the clinic in the read projection
        await db.delete(psychologistClinic).where(eq(psychologistClinic.clinicId, id));
        await db.delete(clinic).where(eq(clinic.id, id));

        console.log(`📈 Read Model Projected: Clinic Deleted -> (${id})`);
    },

    async handlePsychologistLinked(event: DomainEvent): Promise<void> {
        const clinicId = event.aggregateId;
        const { psychologistId } = event.data;

        // Check if already exists in read model to prevent duplicates
        const [existing] = await db
            .select()
            .from(psychologistClinic)
            .where(
                and(
                    eq(psychologistClinic.clinicId, clinicId),
                    eq(psychologistClinic.psychologistId, psychologistId)
                )
            );

        if (!existing) {
            await db.insert(psychologistClinic).values({
                id: crypto.randomUUID(),
                clinicId,
                psychologistId,
                createdAt: event.createdAt ?? new Date(),
                updatedAt: event.createdAt ?? new Date(),
            });
        }

        console.log(`📈 Read Model Projected: Psychologist ${psychologistId} Linked to Clinic ${clinicId}`);
    },

    async handlePsychologistUnlinked(event: DomainEvent): Promise<void> {
        const clinicId = event.aggregateId;
        const { psychologistId } = event.data;

        await db
            .delete(psychologistClinic)
            .where(
                and(
                    eq(psychologistClinic.clinicId, clinicId),
                    eq(psychologistClinic.psychologistId, psychologistId)
                )
            );

        console.log(`📈 Read Model Projected: Psychologist ${psychologistId} Unlinked from Clinic ${clinicId}`);
    },
};
