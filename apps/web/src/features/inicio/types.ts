import type { AppointmentStatus } from "@/features/agendamento/types";

/** Sessão já normalizada para a tela inicial. */
export interface HomeSession {
    id: string;
    /** yyyy-MM-dd do dia da sessão, igual à chave usada nas visões da agenda. */
    dayKey: string;
    startTime: string;
    endTime: string;
    patientName: string;
    status: AppointmentStatus;
    sessionType?: "online" | "in_person";
}
