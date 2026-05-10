import { eq, and, between, desc } from "drizzle-orm";
import { db } from "../db";
import { financialTransaction, patient } from "../db/schema";

export const financialService = {
    async list(psychologistId: string, filters: { startDate?: Date; endDate?: Date }) {
        let query = db
            .select({
                id: financialTransaction.id,
                psychologistId: financialTransaction.psychologistId,
                type: financialTransaction.type,
                description: financialTransaction.description,
                amount: financialTransaction.amount,
                date: financialTransaction.date,
                category: financialTransaction.category,
                patientId: financialTransaction.patientId,
                status: financialTransaction.status,
                createdAt: financialTransaction.createdAt,
                patientNome: patient.nome,
            })
            .from(financialTransaction)
            .leftJoin(patient, eq(financialTransaction.patientId, patient.id))
            .where(
                and(
                    eq(financialTransaction.psychologistId, psychologistId),
                    filters.startDate && filters.endDate
                        ? between(financialTransaction.date, filters.startDate, filters.endDate)
                        : undefined
                )
            )
            .orderBy(desc(financialTransaction.date));

        return query;
    },

    async create(
        psychologistId: string,
        data: {
            type: string;
            description: string;
            amount: string | number;
            date: Date;
            category?: string | null;
            patientId?: string | null;
            status?: string;
        }
    ) {
        const id = crypto.randomUUID();
        const [newTx] = await db
            .insert(financialTransaction)
            .values({
                id,
                psychologistId,
                type: data.type,
                description: data.description,
                amount: String(data.amount),
                date: data.date,
                category: data.category,
                patientId: data.patientId,
                status: data.status || "paid",
            })
            .returning();

        return newTx;
    },
    async update(
        psychologistId: string,
        id: string,
        data: {
            type?: string;
            description?: string;
            amount?: string | number;
            date?: Date;
            category?: string | null;
            patientId?: string | null;
            status?: string;
        }
    ) {
        const [updatedTx] = await db
            .update(financialTransaction)
            .set({
                ...data,
                amount: data.amount !== undefined ? String(data.amount) : undefined,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(financialTransaction.id, id),
                    eq(financialTransaction.psychologistId, psychologistId)
                )
            )
            .returning();
        return updatedTx ?? null;
    },

    async delete(psychologistId: string, id: string) {
        const [deletedTx] = await db
            .delete(financialTransaction)
            .where(
                and(
                    eq(financialTransaction.id, id),
                    eq(financialTransaction.psychologistId, psychologistId)
                )
            )
            .returning();
        return deletedTx ?? null;
    },
};
