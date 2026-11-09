import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { appointment, charge, financialTransaction, patient, payment, type PaymentMethod } from "../db/schema";
import { decryptField, encryptField } from "../lib/encryption";
import { localDay } from "../lib/work-schedule";

export const BILLING_MODELS = ["sessao_avulsa", "mensal"] as const;

function startOfLocalDay(date: Date) {
    return new Date(`${localDay(date).key}T00:00:00-03:00`);
}

function startOfLocalMonth(date: Date) {
    return new Date(`${localDay(date).key.slice(0, 7)}-01T00:00:00-03:00`);
}

export function dueDateFor(model: string | null, sessionDate: Date): Date {
    if (model !== "mensal") return startOfLocalDay(sessionDate);
    const [year, month] = localDay(sessionDate).key.split("-").map(Number);
    const next = new Date(Date.UTC(year, month, 10, 15));
    return startOfLocalDay(next);
}

type AppointmentSnapshot = {
    id: string;
    psychologistId: string;
    patientId: string;
    date: Date;
    status: string;
};

const toNumber = (v: string | number | null | undefined) => Number(v ?? 0);

export const billingService = {
    async syncChargeForAppointment(appt: AppointmentSnapshot) {
        if (appt.status !== "completed") {
            await this.removeOpenChargeForAppointment(appt.id);
            return;
        }

        const [owner] = await db
            .select({ valorSessao: patient.valorSessao, modeloCobranca: patient.modeloCobranca })
            .from(patient)
            .where(and(eq(patient.id, appt.patientId), eq(patient.psychologistId, appt.psychologistId)))
            .limit(1);
        if (!owner) return;

        const sessionDate = new Date(appt.date);
        const dueDate = dueDateFor(owner.modeloCobranca, sessionDate);
        const [existing] = await db
            .select({ id: charge.id, status: charge.status })
            .from(charge)
            .where(eq(charge.appointmentId, appt.id))
            .limit(1);

        if (existing) {
            if (existing.status === "open") {
                await db
                    .update(charge)
                    .set({ patientId: appt.patientId, sessionDate, dueDate, updatedAt: new Date() })
                    .where(eq(charge.id, existing.id));
            }
            return;
        }

        const amount = toNumber(owner.valorSessao);
        if (amount <= 0) return;

        await db
            .insert(charge)
            .values({
                id: crypto.randomUUID(),
                psychologistId: appt.psychologistId,
                patientId: appt.patientId,
                appointmentId: appt.id,
                sessionDate,
                amount: String(amount),
                dueDate,
            })
            .onConflictDoNothing();
    },

    async removeOpenChargeForAppointment(appointmentId: string) {
        await db.delete(charge).where(and(eq(charge.appointmentId, appointmentId), eq(charge.status, "open")));
    },

    async summary(psychologistId: string) {
        const today = startOfLocalDay(new Date());
        const monthStart = startOfLocalMonth(new Date());
        const [[open], [received]] = await Promise.all([
            db
                .select({
                    toReceive: sql<string>`coalesce(sum(${charge.amount}), 0)`,
                    overdue: sql<string>`coalesce(sum(${charge.amount}) filter (where ${charge.dueDate} < ${today.toISOString()}), 0)`,
                    patients: sql<number>`count(distinct ${charge.patientId})::int`,
                })
                .from(charge)
                .where(and(eq(charge.psychologistId, psychologistId), eq(charge.status, "open"))),
            db
                .select({ total: sql<string>`coalesce(sum(${payment.amount}), 0)` })
                .from(payment)
                .where(and(eq(payment.psychologistId, psychologistId), gte(payment.paidAt, monthStart))),
        ]);
        return {
            toReceive: toNumber(open.toReceive),
            overdue: toNumber(open.overdue),
            receivedThisMonth: toNumber(received.total),
            patientsWithBalance: open.patients,
        };
    },

    async receivables(psychologistId: string) {
        const today = startOfLocalDay(new Date());
        const rows = await db
            .select({
                patientId: charge.patientId,
                nome: patient.nome,
                telefone: patient.telefone,
                modeloCobranca: patient.modeloCobranca,
                openCount: sql<number>`count(*)::int`,
                total: sql<string>`sum(${charge.amount})`,
                overdueTotal: sql<string>`coalesce(sum(${charge.amount}) filter (where ${charge.dueDate} < ${today.toISOString()}), 0)`,
                oldestDueDate: sql<Date>`min(${charge.dueDate})`.mapWith(charge.dueDate),
            })
            .from(charge)
            .innerJoin(patient, eq(charge.patientId, patient.id))
            .where(and(eq(charge.psychologistId, psychologistId), eq(charge.status, "open")))
            .groupBy(charge.patientId, patient.nome, patient.telefone, patient.modeloCobranca)
            .orderBy(asc(sql`min(${charge.dueDate})`));

        return rows.map((r) => ({
            id: r.patientId,
            patientId: r.patientId,
            nome: decryptField(r.nome),
            telefone: decryptField(r.telefone),
            modeloCobranca: r.modeloCobranca,
            openCount: r.openCount,
            total: toNumber(r.total),
            overdueTotal: toNumber(r.overdueTotal),
            oldestDueDate: r.oldestDueDate,
        }));
    },

    async patientStatement(psychologistId: string, patientId: string) {
        const [row] = await db
            .select()
            .from(patient)
            .where(and(eq(patient.id, patientId), eq(patient.psychologistId, psychologistId)))
            .limit(1);
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Paciente não encontrado." });

        const [charges, payments] = await Promise.all([
            db
                .select({
                    id: charge.id,
                    appointmentId: charge.appointmentId,
                    sessionDate: charge.sessionDate,
                    amount: charge.amount,
                    dueDate: charge.dueDate,
                    status: charge.status,
                    paidAt: charge.paidAt,
                    paymentId: charge.paymentId,
                })
                .from(charge)
                .where(and(eq(charge.psychologistId, psychologistId), eq(charge.patientId, patientId)))
                .orderBy(desc(charge.sessionDate)),
            db
                .select({ id: payment.id, amount: payment.amount, paidAt: payment.paidAt, method: payment.method })
                .from(payment)
                .where(and(eq(payment.psychologistId, psychologistId), eq(payment.patientId, patientId)))
                .orderBy(desc(payment.paidAt)),
        ]);

        return {
            patient: {
                id: row.id,
                nome: decryptField(row.nome),
                telefone: decryptField(row.telefone),
                cpf: decryptField(row.cpf),
                valorSessao: row.valorSessao === null ? null : toNumber(row.valorSessao),
                modeloCobranca: row.modeloCobranca,
                responsavelFinanceiroTipo: row.responsavelFinanceiroTipo,
                responsavelFinanceiroDetalhe: decryptField(row.responsavelFinanceiroDetalhe),
                respLegalNome: decryptField(row.respLegalNome),
                respLegalCpf: decryptField(row.respLegalCpf),
            },
            charges: charges.map((c) => ({ ...c, amount: toNumber(c.amount) })),
            payments: payments.map((p) => ({ ...p, amount: toNumber(p.amount) })),
        };
    },

    async registerPayment(
        psychologistId: string,
        input: { patientId: string; chargeIds: string[]; paidAt: Date; method: PaymentMethod }
    ) {
        const chargeIds = [...new Set(input.chargeIds)];
        return db.transaction(async (tx) => {
            const open = await tx
                .select({ id: charge.id, amount: charge.amount })
                .from(charge)
                .where(
                    and(
                        inArray(charge.id, chargeIds),
                        eq(charge.psychologistId, psychologistId),
                        eq(charge.patientId, input.patientId),
                        eq(charge.status, "open")
                    )
                )
                .for("update");

            if (open.length !== chargeIds.length) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Alguma cobrança selecionada não está mais em aberto. Atualize a tela e tente de novo.",
                });
            }

            const amount = open.reduce((sum, c) => sum + toNumber(c.amount), 0).toFixed(2);
            const transactionId = crypto.randomUUID();
            const paymentId = crypto.randomUUID();
            const description = `Pagamento de ${open.length} ${open.length === 1 ? "sessão" : "sessões"}`;

            await tx.insert(financialTransaction).values({
                id: transactionId,
                psychologistId,
                type: "income",
                description: encryptField(description) ?? description,
                amount,
                date: input.paidAt,
                category: "Sessão",
                patientId: input.patientId,
                status: "paid",
            });
            await tx.insert(payment).values({
                id: paymentId,
                psychologistId,
                patientId: input.patientId,
                amount,
                paidAt: input.paidAt,
                method: input.method,
                financialTransactionId: transactionId,
            });
            await tx
                .update(charge)
                .set({ status: "paid", paidAt: input.paidAt, paymentId, updatedAt: new Date() })
                .where(inArray(charge.id, chargeIds));

            return { paymentId, amount: toNumber(amount), financialTransactionId: transactionId };
        });
    },

    async undoPayment(psychologistId: string, paymentId: string) {
        return db.transaction(async (tx) => {
            const [found] = await tx
                .select({ id: payment.id, financialTransactionId: payment.financialTransactionId })
                .from(payment)
                .where(and(eq(payment.id, paymentId), eq(payment.psychologistId, psychologistId)))
                .for("update");
            if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "Pagamento não encontrado." });

            const reopened = await tx
                .update(charge)
                .set({ status: "open", paidAt: null, paymentId: null, updatedAt: new Date() })
                .where(and(eq(charge.paymentId, found.id), eq(charge.psychologistId, psychologistId)))
                .returning({ id: charge.id, appointmentId: charge.appointmentId });
            const appointmentIds = reopened.flatMap((c) => (c.appointmentId ? [c.appointmentId] : []));
            if (appointmentIds.length > 0) {
                const notCompleted = await tx
                    .select({ id: appointment.id })
                    .from(appointment)
                    .where(and(inArray(appointment.id, appointmentIds), ne(appointment.status, "completed")));
                if (notCompleted.length > 0) {
                    await tx.delete(charge).where(
                        and(
                            inArray(charge.appointmentId, notCompleted.map((a) => a.id)),
                            eq(charge.status, "open")
                        )
                    );
                }
            }
            await tx.delete(payment).where(eq(payment.id, found.id));
            if (found.financialTransactionId) {
                await tx
                    .delete(financialTransaction)
                    .where(
                        and(
                            eq(financialTransaction.id, found.financialTransactionId),
                            eq(financialTransaction.psychologistId, psychologistId)
                        )
                    );
            }
            return { success: true };
        });
    },

    async exportForPsychologist(psychologistId: string) {
        const [charges, payments] = await Promise.all([
            db.select().from(charge).where(eq(charge.psychologistId, psychologistId)).orderBy(desc(charge.sessionDate)),
            db.select().from(payment).where(eq(payment.psychologistId, psychologistId)).orderBy(desc(payment.paidAt)),
        ]);
        return {
            charges: charges.map((c) => ({ ...c, amount: toNumber(c.amount) })),
            payments: payments.map((p) => ({ ...p, amount: toNumber(p.amount) })),
        };
    },

    async waiveCharge(psychologistId: string, chargeId: string) {
        const [waived] = await db
            .update(charge)
            .set({ status: "waived", updatedAt: new Date() })
            .where(and(eq(charge.id, chargeId), eq(charge.psychologistId, psychologistId), eq(charge.status, "open")))
            .returning({ id: charge.id });
        if (!waived) throw new TRPCError({ code: "NOT_FOUND", message: "Cobrança em aberto não encontrada." });
        return { success: true };
    },
};
