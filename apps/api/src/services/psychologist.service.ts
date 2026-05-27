import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { user, patient, appointment, eventStore, document, clinicalRecord } from "../db/schema";
import { storageService } from "./storage.service";
import { patientQueries } from "../cqrs/patient/patient.queries";
import { clinicalRecordService } from "./clinical-record.service";
import { documentService } from "./document.service";
import { financialService } from "./financial.service";
import { appointmentQueries } from "../cqrs/appointment/appointment.queries";

export type Psychologist = typeof user.$inferSelect;
export type ThemeConfig = { primary?: string; sidebar?: string; button?: string; tableHeader?: string };
export type PsychologistUpdate = Partial<Pick<Psychologist, "name" | "phone" | "crp" | "city" | "image">> & {
    themeConfig?: ThemeConfig | null;
};

/**
 * Psychologist service — business logic for psychologist profiles.
 * Keeps tRPC routers thin (controller layer only).
 */
export const psychologistService = {
    async getById(id: string) {
        const [result] = await db
            .select()
            .from(user)
            .where(eq(user.id, id))
            .limit(1);
        return result ?? null;
    },

    async getByEmail(email: string) {
        const [result] = await db
            .select()
            .from(user)
            .where(eq(user.email, email))
            .limit(1);
        return result ?? null;
    },

    async updateProfile(id: string, data: PsychologistUpdate) {
        const [updated] = await db
            .update(user)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id))
            .returning();
        return updated;
    },

    async list() {
        return db
            .select({
                id: user.id,
                name: user.name,
                crp: user.crp,
                city: user.city,
            })
            .from(user);
    },

    async exportData(id: string) {
        const [psychologist, patients, clinicalRecords, allAppointments, financialTransactions, documents] =
            await Promise.all([
                this.getById(id),
                patientQueries.list(id),
                clinicalRecordService.list(id),
                appointmentQueries.list(id),
                financialService.list(id, {}),
                documentService.list(id),
            ]);

        const appointments = allAppointments.filter((a) => a.isOwn);
        const documentsWithoutContent = documents.map(({ content: _content, ...rest }) => rest);

        return {
            exportedAt: new Date().toISOString(),
            psychologist: {
                id: psychologist?.id,
                name: psychologist?.name,
                email: psychologist?.email,
                crp: psychologist?.crp,
                phone: psychologist?.phone,
                city: psychologist?.city,
            },
            patients,
            clinicalRecords,
            documents: documentsWithoutContent,
            financialTransactions,
            appointments,
        };
    },

    async deleteAccount(id: string) {
        // Collect S3 storage keys before deletion so we can remove the physical files.
        const [documentKeys, recordKeys, patientRows, appointmentRows] = await Promise.all([
            db.select({ storageKey: document.storageKey })
                .from(document)
                .where(eq(document.psychologistId, id)),
            db.select({ storageKey: clinicalRecord.storageKey })
                .from(clinicalRecord)
                .where(eq(clinicalRecord.psychologistId, id)),
            db.select({ id: patient.id })
                .from(patient)
                .where(eq(patient.psychologistId, id)),
            db.select({ id: appointment.id })
                .from(appointment)
                .where(eq(appointment.psychologistId, id)),
        ]);

        // Remove event_store rows (no FK by design in the event-sourcing pattern).
        const aggregateIds = [
            ...patientRows.map((r) => r.id),
            ...appointmentRows.map((r) => r.id),
        ];
        if (aggregateIds.length > 0) {
            await db.delete(eventStore).where(inArray(eventStore.aggregateId, aggregateIds));
        }

        // Deleting the user cascades all related business tables in the DB.
        await db.delete(user).where(eq(user.id, id));

        // Remove S3/local files after the DB delete — allSettled so a storage
        // failure does not prevent the account from being considered deleted.
        const storageKeys = [
            ...documentKeys.map((r) => r.storageKey),
            ...recordKeys.map((r) => r.storageKey),
        ].filter((k): k is string => !!k);

        if (storageKeys.length > 0) {
            await Promise.allSettled(storageKeys.map((k) => storageService.deleteObject(k)));
        }
    },
};
