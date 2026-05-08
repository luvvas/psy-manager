export type AppointmentStatus = "confirmado" | "pendente" | "cancelado" | "concluido";

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
    date: Date;
    startTime: string;
    endTime: string;
    status: AppointmentStatus;
    type: "individual" | "casal" | "infantil" | "avaliacao";
    notes?: string;
    isRecurring?: boolean;
    sessionType?: "online" | "in_person";
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
