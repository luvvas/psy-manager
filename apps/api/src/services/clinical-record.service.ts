import { db } from "../db";
import { clinicalRecord, patient } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { encryptField, decryptField } from "../lib/encryption";

export const clinicalRecordService = {
    async list(psychologistId: string, filters?: { patientId?: string }) {
        let conditions = eq(clinicalRecord.psychologistId, psychologistId);

        if (filters?.patientId) {
            conditions = and(conditions, eq(clinicalRecord.patientId, filters.patientId)) as any;
        }

        const rows = await db
            .select()
            .from(clinicalRecord)
            .where(conditions)
            .orderBy(desc(clinicalRecord.dateOfService));

        return rows.map((r) => ({
            ...r,
            title: decryptField(r.title) ?? r.title,
            textContent: decryptField(r.textContent),
        }));
    },

    async getById(psychologistId: string, id: string) {
        const [record] = await db
            .select()
            .from(clinicalRecord)
            .where(and(eq(clinicalRecord.id, id), eq(clinicalRecord.psychologistId, psychologistId)));

        if (!record) return null;
        return {
            ...record,
            title: decryptField(record.title) ?? record.title,
            textContent: decryptField(record.textContent),
        };
    },

    async create(
        psychologistId: string,
        data: {
            title: string;
            patientId: string;
            category?: string;
            textContent?: string;
            fileUrl?: string;
            storageKey?: string;
            fileName?: string;
            mimeType?: string;
            fileSize?: number;
            dateOfService?: Date;
            appointmentId?: string;
        }
    ) {
        const [ownedPatient] = await db
            .select({ id: patient.id })
            .from(patient)
            .where(and(eq(patient.id, data.patientId), eq(patient.psychologistId, psychologistId)))
            .limit(1);

        if (!ownedPatient) {
            throw new Error("Paciente não encontrado.");
        }

        const id = randomUUID();
        await db.insert(clinicalRecord).values({
            id,
            psychologistId,
            patientId: data.patientId,
            title: encryptField(data.title) ?? data.title,
            category: data.category || "evolucao",
            textContent: encryptField(data.textContent),
            fileUrl: data.fileUrl,
            storageKey: data.storageKey,
            fileName: data.fileName,
            mimeType: data.mimeType,
            fileSize: data.fileSize,
            dateOfService: data.dateOfService || new Date(),
            appointmentId: data.appointmentId || null,
            status: "draft",
        });

        return { id, success: true };
    },

    async update(
        psychologistId: string,
        id: string,
        data: {
            title?: string;
            category?: string;
            textContent?: string;
            fileUrl?: string;
            storageKey?: string;
            fileName?: string;
            mimeType?: string;
            fileSize?: number;
            dateOfService?: Date;
        }
    ) {
        const [record] = await db
            .select({ status: clinicalRecord.status })
            .from(clinicalRecord)
            .where(and(eq(clinicalRecord.id, id), eq(clinicalRecord.psychologistId, psychologistId)));

        if (!record) throw new Error("Registro não encontrado");
        if (record.status === "finalized") throw new Error("Registros finalizados não podem ser alterados.");

        const encryptedData = {
            ...data,
            ...(data.title !== undefined && { title: encryptField(data.title) ?? data.title }),
            ...(data.textContent !== undefined && { textContent: encryptField(data.textContent) }),
        };
        await db
            .update(clinicalRecord)
            .set({
                ...encryptedData,
                updatedAt: new Date(),
            })
            .where(and(eq(clinicalRecord.id, id), eq(clinicalRecord.psychologistId, psychologistId)));
        
        return { success: true };
    },

    async finalize(psychologistId: string, id: string) {
        const [record] = await db
            .select({ status: clinicalRecord.status })
            .from(clinicalRecord)
            .where(and(eq(clinicalRecord.id, id), eq(clinicalRecord.psychologistId, psychologistId)));

        if (!record) throw new Error("Registro não encontrado");
        if (record.status === "finalized") return { success: true };

        await db
            .update(clinicalRecord)
            .set({
                status: "finalized",
                lockedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(and(eq(clinicalRecord.id, id), eq(clinicalRecord.psychologistId, psychologistId)));

        return { success: true };
    },

    async delete(psychologistId: string, id: string) {
        const [record] = await db
            .select({ status: clinicalRecord.status })
            .from(clinicalRecord)
            .where(and(eq(clinicalRecord.id, id), eq(clinicalRecord.psychologistId, psychologistId)));

        if (!record) throw new Error("Registro não encontrado");
        if (record.status === "finalized") throw new Error("Registros finalizados não podem ser excluídos.");

        await db
            .delete(clinicalRecord)
            .where(and(eq(clinicalRecord.id, id), eq(clinicalRecord.psychologistId, psychologistId)));
        
        return { success: true };
    },
};
