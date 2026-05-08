import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { patient } from "../../db/schema";

/**
 * Patient Queries (Read-only side of CQRS)
 * Queries read directly from the high-performance relational Projection tables (not replaying events),
 * fulfilling the main performance benefit of CQRS.
 */
export const patientQueries = {
    /**
     * Lists all patients for a psychologist.
     */
    async list(psychologistId: string) {
        return db
            .select()
            .from(patient)
            .where(eq(patient.psychologistId, psychologistId));
    },

    /**
     * Finds a single patient by ID.
     */
    async findById(psychologistId: string, id: string) {
        const [result] = await db
            .select()
            .from(patient)
            .where(
                and(
                    eq(patient.id, id),
                    eq(patient.psychologistId, psychologistId)
                )
            );
        return result ?? null;
    },
};
