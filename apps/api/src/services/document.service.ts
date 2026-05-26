import { db } from "../db";
import { document } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { encryptField, decryptField } from "../lib/encryption";
import { storageService } from "./storage.service";

export const documentService = {
    async list(psychologistId: string, filters?: { patientId?: string; isTemplate?: boolean }) {
        let conditions = eq(document.psychologistId, psychologistId);

        if (filters?.patientId) {
            conditions = and(conditions, eq(document.patientId, filters.patientId)) as any;
        }

        if (filters?.isTemplate !== undefined) {
            conditions = and(conditions, eq(document.isTemplate, filters.isTemplate)) as any;
        }

        const rows = await db
            .select()
            .from(document)
            .where(conditions)
            .orderBy(desc(document.updatedAt));

        return rows.map((r) => ({
            ...r,
            title: decryptField(r.title) ?? r.title,
            content: decryptField(r.content),
        }));
    },

    async getById(psychologistId: string, id: string) {
        const [doc] = await db
            .select()
            .from(document)
            .where(and(eq(document.id, id), eq(document.psychologistId, psychologistId)));

        if (!doc) return null;
        return {
            ...doc,
            title: decryptField(doc.title) ?? doc.title,
            content: decryptField(doc.content),
        };
    },

    async create(
        psychologistId: string,
        data: {
            title: string;
            content?: string;
            storageKey?: string;
            fileName?: string;
            mimeType?: string;
            fileSize?: number;
            type?: string;
            category?: string;
            isTemplate?: boolean;
            patientId?: string;
        }
    ) {
        const id = randomUUID();
        await db.insert(document).values({
            id,
            psychologistId,
            title: encryptField(data.title) ?? data.title,
            content: encryptField(data.content || ""),
            storageKey: data.storageKey,
            fileName: data.fileName,
            mimeType: data.mimeType,
            fileSize: data.fileSize,
            type: data.type || "outro",
            category: data.category,
            isTemplate: data.isTemplate ?? false,
            patientId: data.patientId || null,
        });

        return { id, success: true };
    },

    async update(
        psychologistId: string,
        id: string,
        data: {
            title?: string;
            content?: string;
            storageKey?: string;
            fileName?: string;
            mimeType?: string;
            fileSize?: number;
            type?: string;
            category?: string;
            isTemplate?: boolean;
            patientId?: string;
        }
    ) {
        const [existing] = await db
            .select({ id: document.id })
            .from(document)
            .where(and(eq(document.id, id), eq(document.psychologistId, psychologistId)))
            .limit(1);

        if (!existing) throw new Error("Documento não encontrado.");

        const encryptedData = {
            ...data,
            ...(data.title !== undefined && { title: encryptField(data.title) ?? data.title }),
            ...(data.content !== undefined && { content: encryptField(data.content) }),
        };
        await db
            .update(document)
            .set({ ...encryptedData, updatedAt: new Date() })
            .where(and(eq(document.id, id), eq(document.psychologistId, psychologistId)));

        return { success: true };
    },

    async delete(psychologistId: string, id: string) {
        const [existing] = await db
            .select({ id: document.id, storageKey: document.storageKey })
            .from(document)
            .where(and(eq(document.id, id), eq(document.psychologistId, psychologistId)))
            .limit(1);

        if (!existing) throw new Error("Documento não encontrado.");

        await db
            .delete(document)
            .where(and(eq(document.id, id), eq(document.psychologistId, psychologistId)));

        if (existing.storageKey) {
            await storageService.deleteObject(existing.storageKey);
        }

        return { success: true };
    },
};
