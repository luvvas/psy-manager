import * as z from "zod/v3";
import { TIME_24H_REGEX } from "@/components/time-input";
import { isHttpUrl } from "@/utils/safe-url";

export const NO_CLINIC = "none";
export const ANY_ROOM = "any";

export interface SelectOption {
    value: string;
    label: string;
}

export const TYPE_OPTIONS: SelectOption[] = [
    { value: "individual", label: "Individual" },
    { value: "casal", label: "Casal" },
    { value: "infantil", label: "Infantil" },
    { value: "avaliacao", label: "Avaliação" },
];

export const SESSION_TYPE_OPTIONS: SelectOption[] = [
    { value: "online", label: "Online" },
    { value: "in_person", label: "Presencial" },
];

export const STATUS_OPTIONS: SelectOption[] = [
    { value: "pending", label: "Pendente" },
    { value: "confirmed", label: "Confirmado" },
    { value: "cancelled", label: "Cancelado" },
    { value: "completed", label: "Concluído" },
];

export const appointmentSchema = z.object({
    patientId: z.string().min(1, "O paciente é obrigatório"),
    date: z.date({ required_error: "A data é obrigatória" }),
    startTime: z
        .string()
        .min(1, "O horário de início é obrigatório")
        .regex(TIME_24H_REGEX, "Use o formato HH:MM (ex.: 14:30)"),
    endTime: z
        .string()
        .min(1, "O horário de término é obrigatório")
        .regex(TIME_24H_REGEX, "Use o formato HH:MM (ex.: 14:30)"),
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
    sessionType: z.enum(["online", "in_person"]),
    type: z.enum(["individual", "casal", "infantil", "avaliacao"]),
    isRecurring: z.boolean(),
    notes: z.string().optional(),
    meetingUrl: z
        .string()
        .optional()
        .refine((v) => !v || isHttpUrl(v), "Informe o link completo, começando com https://"),
    reminderEnabled: z.boolean(),
    reminderMinutesBefore: z.number().int().positive().optional(),
    clinicId: z.string(),
    roomId: z.string(),
}).refine((v) => !TIME_24H_REGEX.test(v.startTime) || !TIME_24H_REGEX.test(v.endTime) || v.startTime < v.endTime, {
    message: "O fim deve ser depois do início",
    path: ["endTime"],
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema> & {
    allowScheduleConflicts?: boolean;
};

export type AppointmentFormInitialData = Omit<Partial<AppointmentFormValues>, "clinicId" | "roomId"> & {
    id?: string;
    psychologistId?: string;
    isMine?: boolean;
    clinicId?: string | null;
    roomId?: string | null;
    reminderSentAt?: Date | string | null;
};

export function toFormDefaultValues(
    initialData: AppointmentFormInitialData | undefined,
    defaultTimes: { startTime: string; endTime: string }
): AppointmentFormValues {
    return {
        patientId: initialData?.patientId || "",
        date: initialData?.date ? new Date(initialData.date) : new Date(),
        startTime: initialData?.startTime || defaultTimes.startTime,
        endTime: initialData?.endTime || defaultTimes.endTime,
        status: initialData?.status || "pending",
        sessionType: initialData?.sessionType || "online",
        type: initialData?.type || "individual",
        isRecurring: initialData?.isRecurring || false,
        notes: initialData?.notes || "",
        meetingUrl: initialData?.meetingUrl || "",
        reminderEnabled: initialData?.reminderEnabled ?? false,
        reminderMinutesBefore: initialData?.reminderMinutesBefore ?? 60,
        clinicId: initialData?.clinicId || NO_CLINIC,
        roomId: initialData?.roomId || ANY_ROOM,
    };
}
