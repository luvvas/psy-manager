import { z } from "zod";
import { router, flaggedProcedure } from "../trpc/index";
import { billingService } from "../services/billing.service";
import { assertPatientOwnership } from "../lib/ownership";
import { PAYMENT_METHODS } from "../db/schema";

const billingProcedure = flaggedProcedure("pagamentos");

export const billingRouter = router({
    summary: billingProcedure.query(async ({ ctx }) => {
        return billingService.summary(ctx.session.user.id);
    }),

    receivables: billingProcedure.query(async ({ ctx }) => {
        return billingService.receivables(ctx.session.user.id);
    }),

    patientStatement: billingProcedure
        .input(z.object({ patientId: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            return billingService.patientStatement(ctx.session.user.id, input.patientId);
        }),

    registerPayment: billingProcedure
        .input(
            z.object({
                patientId: z.string().min(1),
                chargeIds: z.array(z.string().min(1)).min(1, "Selecione ao menos uma cobrança.").max(200),
                paidAt: z.string().or(z.date()).transform((v) => new Date(v)),
                method: z.enum(PAYMENT_METHODS),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await assertPatientOwnership(input.patientId, ctx.session.user.id);
            return billingService.registerPayment(ctx.session.user.id, input);
        }),

    undoPayment: billingProcedure
        .input(z.object({ paymentId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return billingService.undoPayment(ctx.session.user.id, input.paymentId);
        }),

    waiveCharge: billingProcedure
        .input(z.object({ chargeId: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return billingService.waiveCharge(ctx.session.user.id, input.chargeId);
        }),
});
