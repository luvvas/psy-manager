import type { AppointmentStatus } from "@/features/agendamento/types";

export interface HomeSession {
    id: string;
    dayKey: string;
    startTime: string;
    endTime: string;
    patientName: string;
    status: AppointmentStatus;
    sessionType?: "online" | "in_person";
}
