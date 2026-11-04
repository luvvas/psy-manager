import { TRPCError } from "@trpc/server";
import { eq, and, between, desc } from "drizzle-orm";
import { db } from "../db";
import { financialTransaction, patient, payment, type TransactionStatus, type TransactionType } from "../db/schema";
import { encryptField, decryptField } from "../lib/encryption";

const LINKED_TO_PAYMENT =
    "Esta receita veio de um pagamento de sessões. Para corrigir, desfaça o pagamento na aba Financeiro do paciente.";

async function linkedTransaction(psychologistId: string, id: string) {
    const [row] = await db
        .select({
            type: financialTransaction.type,
            amount: financialTransaction.amount,
            status: financialTransaction.status,
            patientId: financialTransaction.patientId,
        })
        .from(financialTransaction)
        .innerJoin(payment, eq(payment.financialTransactionId, financialTransaction.id))
        .where(and(eq(financialTransaction.id, id), eq(financialTransaction.psychologistId, psychologistId)))
        .limit(1);
    return row ?? null;
}

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
            .leftJoin(
                patient,
                and(eq(financialTransaction.patientId, patient.id), eq(patient.psychologistId, psychologistId))
            )
            .where(
                and(
                    eq(financialTransaction.psychologistId, psychologistId),
                    filters.startDate && filters.endDate
                        ? between(financialTransaction.date, filters.startDate, filters.endDate)
                        : undefined
                )
            )
            .orderBy(desc(financialTransaction.date));

        const rows = await query;
        return rows.map((r) => ({
            ...r,
            description: decryptField(r.description) ?? r.description,
            patientNome: decryptField(r.patientNome),
        }));
    },

    async create(
        psychologistId: string,
        data: {
            type: TransactionType;
            description: string;
            amount: string | number;
            date: Date;
            category?: string | null;
            patientId?: string | null;
            status?: TransactionStatus;
        }
    ) {
        const id = crypto.randomUUID();
        const [newTx] = await db
            .insert(financialTransaction)
            .values({
                id,
                psychologistId,
                type: data.type,
                description: encryptField(data.description) ?? data.description,
                amount: String(data.amount),
                date: data.date,
                category: data.category || null,
                patientId: data.patientId || null,
                status: data.status || "paid",
            })
            .returning();

        return newTx;
    },

    async createMany(
        psychologistId: string,
        items: Array<{
            type: TransactionType;
            description: string;
            amount: string | number;
            date: Date;
            category?: string | null;
            status?: TransactionStatus;
        }>
    ) {
        const values = items.map(item => ({
            id: crypto.randomUUID(),
            psychologistId,
            type: item.type,
            description: encryptField(item.description) ?? item.description,
            amount: String(item.amount),
            date: item.date,
            category: item.category || null,
            status: item.status || "paid",
        }));

        if (values.length === 0) return [];

        const result = await db
            .insert(financialTransaction)
            .values(values)
            .returning();

        return result;
    },

    async update(
        psychologistId: string,
        id: string,
        data: {
            type?: TransactionType;
            description?: string;
            amount?: string | number;
            date?: Date;
            category?: string | null;
            patientId?: string | null;
            status?: TransactionStatus;
        }
    ) {
        const linked = await linkedTransaction(psychologistId, id);
        if (
            linked &&
            ((data.type !== undefined && data.type !== linked.type) ||
                (data.amount !== undefined && Number(data.amount) !== Number(linked.amount)) ||
                (data.status !== undefined && data.status !== linked.status) ||
                (data.patientId !== undefined && (data.patientId || null) !== linked.patientId))
        ) {
            throw new TRPCError({ code: "BAD_REQUEST", message: LINKED_TO_PAYMENT });
        }

        const [updatedTx] = await db
            .update(financialTransaction)
            .set({
                ...data,
                description: data.description !== undefined ? (encryptField(data.description) ?? data.description) : undefined,
                amount: data.amount !== undefined ? String(data.amount) : undefined,
                category: data.category === undefined ? undefined : (data.category || null),
                patientId: data.patientId === undefined ? undefined : (data.patientId || null),
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
        if (await linkedTransaction(psychologistId, id)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: LINKED_TO_PAYMENT });
        }

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
