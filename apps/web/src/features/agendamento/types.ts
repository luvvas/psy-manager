export type AppointmentStatus = "confirmado" | "pendente" | "cancelado" | "concluido";

export type ApiAppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";

export const STATUS_FROM_API: Record<string, AppointmentStatus> = {
    confirmed: "confirmado",
    confirmado: "confirmado",
    pending: "pendente",
    pendente: "pendente",
    cancelled: "cancelado",
    cancelado: "cancelado",
    completed: "concluido",
    concluido: "concluido",
};

export const STATUS_TO_API: Record<AppointmentStatus, ApiAppointmentStatus> = {
    confirmado: "confirmed",
    pendente: "pending",
    cancelado: "cancelled",
    concluido: "completed",
};

export interface Patient {
    id: string;
    name: string;
    email: string;
    phone: string;
    initials: string;
}

export interface Psychologist {
    id: string;
    name: string;
    email: string;
}

export interface Appointment {
    id: string;
    patient: Patient;
    psychologist?: Psychologist;
    psychologistId?: string;
    isMine: boolean;
    date: Date;
    startTime: string;
    endTime: string;
    status: AppointmentStatus;
    type: "individual" | "casal" | "infantil" | "avaliacao";
    notes?: string;
    meetingUrl?: string;
    isRecurring?: boolean;
    sessionType?: "online" | "in_person";
    clinicId?: string | null;
    roomId?: string | null;
    roomName?: string | null;
    reminderEnabled?: boolean;
    reminderMinutesBefore?: number | null;
    reminderSentAt?: Date | string | null;
}

export const APPOINTMENT_TYPE_LABELS: Record<Appointment["type"], string> = {
    individual: "Individual",
    casal: "Casal",
    infantil: "Infantil",
    avaliacao: "Avaliação",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
    confirmado: "Confirmado",
    pendente: "Pendente",
    cancelado: "Cancelado",
    concluido: "Concluído",
};
