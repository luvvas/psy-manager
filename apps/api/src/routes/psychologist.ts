import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { psychologistService } from "../services/psychologist.service";
import { workScheduleSchema } from "../lib/work-schedule";

const optionalText = (max: number) =>
    z.string().trim().max(max).optional().nullable().transform((v) => (v === undefined ? undefined : v || null));

const optionalCpf = optionalText(14)
    .transform((v) => (v ? v.replace(/\D/g, "") : v))
    .refine((v) => !v || v.length === 11, "CPF inválido");

const optionalState = optionalText(2)
    .transform((v) => (v ? v.toUpperCase() : v))
    .refine((v) => !v || /^[A-Z]{2}$/.test(v), "UF inválida");

export const psychologistRouter = router({
    me: protectedProcedure.query(async ({ ctx }) => {
        return psychologistService.getById(ctx.session.user.id);
    }),

    updateProfile: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1).optional(),
                phone: z.string().optional(),
                crp: z.string().optional(),
                city: z.string().optional(),
                themeConfig: z.object({
                    primary: z.string().optional(),
                    sidebar: z.string().optional(),
                    button: z.string().optional(),
                    tableHeader: z.string().optional(),
                }).optional().nullable(),
                workSchedule: workScheduleSchema.optional().nullable(),
                googleSyncDaysBack: z.number().int().min(0).max(365).optional(),
                googleSyncDaysAhead: z.number().int().min(1).max(365).optional(),
                pixKey: optionalText(77),
                cpf: optionalCpf,
                addressZip: optionalText(9),
                addressStreet: optionalText(120),
                addressNumber: optionalText(20),
                addressComplement: optionalText(60),
                addressDistrict: optionalText(60),
                state: optionalState,
            })
        )
        .mutation(async ({ ctx, input }) => {
            return psychologistService.updateProfile(ctx.session.user.id, input);
        }),

    exportData: protectedProcedure.query(async ({ ctx }) => {
        return psychologistService.exportData(ctx.session.user.id);
    }),

    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
        await psychologistService.deleteAccount(ctx.session.user.id);
        return { success: true };
    }),
});
