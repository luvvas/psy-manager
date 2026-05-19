import { eq } from "drizzle-orm";
import { db } from "../../db";
import { appointment } from "../../db/schema";
import { eventBus } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";
import { encryptField } from "../../lib/encryption";

export const appointmentProjections = {
    init() {
        eventBus.subscribe("APPOINTMENT_SCHEDULED", this.handleAppointmentScheduled);
        eventBus.subscribe("APPOINTMENT_RESCHEDULED", this.handleAppointmentRescheduled);
        eventBus.subscribe("APPOINTMENT_CANCELLED", this.handleAppointmentCancelled);
        console.log("📈 Appointment Projections subscribed to EventBus");
    },

    async handleAppointmentScheduled(event: DomainEvent): Promise<void> {
        const { id, psychologistId, patientId, date, startTime, endTime, status, sessionType, type, isRecurring, notes, googleEventId } = event.data;

        await db.insert(appointment).values({
            id,
            psychologistId,
            patientId,
            date: new Date(date),
            startTime,
            endTime,
            status,
            sessionType,
            type,
            isRecurring,
            notes: encryptField(notes ?? null),
            googleEventId: googleEventId ?? null,
            createdAt: event.createdAt ?? new Date(),
            updatedAt: event.createdAt ?? new Date(),
        });

        console.log(`📈 Read Model Projected: Appointment Scheduled -> (${id})`);
    },

    async handleAppointmentRescheduled(event: DomainEvent): Promise<void> {
        const { patientId, date, startTime, endTime, status, sessionType, type, isRecurring, notes, googleEventId } = event.data;
        const id = event.aggregateId;

        await db
            .update(appointment)
            .set({
                patientId,
                date: new Date(date),
                startTime,
                endTime,
                status,
                sessionType,
                type,
                isRecurring,
                notes: encryptField(notes ?? null),
                googleEventId: googleEventId ?? null,
                updatedAt: event.createdAt ?? new Date(),
            })
            .where(eq(appointment.id, id));

        console.log(`📈 Read Model Projected: Appointment Rescheduled -> (${id})`);
    },

    async handleAppointmentCancelled(event: DomainEvent): Promise<void> {
        const id = event.aggregateId;

        await db.delete(appointment).where(eq(appointment.id, id));

        console.log(`📈 Read Model Projected: Appointment Deleted -> (${id})`);
    },
};
