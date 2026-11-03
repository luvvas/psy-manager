import type { RouterInputs, RouterOutputs } from "@/lib/trpc";
import type { AppointmentFormInitialData, AppointmentFormValues } from "./appointment-schema";
import { STATUS_FROM_API, STATUS_TO_API, type Appointment } from "./types";

type AppointmentRow = RouterOutputs["appointment"]["list"][number];
type AppointmentPayload = RouterInputs["appointment"]["create"];

function initialsOf(name: string): string {
    return (
        name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "CR"
    );
}

export function toAppointment(row: AppointmentRow, currentUserId: string | undefined): Appointment {
    return {
        id: row.id,
        psychologistId: row.psychologistId,
        isMine: !!currentUserId && row.psychologistId === currentUserId,
        psychologist: row.psychologist
            ? { id: row.psychologist.id, name: row.psychologist.name, email: row.psychologist.email }
            : undefined,
        patient: {
            id: row.patient?.id ?? "",
            name: row.patient?.nome ?? "Consulta reservada",
            email: row.patient?.email ?? "",
            phone: row.patient?.telefone ?? "",
            initials: initialsOf(row.patient?.nome ?? ""),
        },
        date: new Date(row.date),
        startTime: row.startTime,
        endTime: row.endTime,
        status: STATUS_FROM_API[row.status] ?? "pendente",
        type: row.type,
        notes: row.notes || undefined,
        meetingUrl: row.meetingUrl || undefined,
        isRecurring: row.isRecurring,
        sessionType: row.sessionType,
        clinicId: row.clinicId ?? null,
        roomId: row.roomId ?? null,
        roomName: row.roomName ?? null,
        reminderEnabled: row.reminderEnabled ?? false,
        reminderMinutesBefore: row.reminderMinutesBefore ?? null,
        reminderSentAt: row.reminderSentAt ?? null,
    };
}

export function toFormInitialData(appointment: Appointment): AppointmentFormInitialData {
    return {
        id: appointment.id,
        psychologistId: appointment.psychologistId,
        isMine: appointment.isMine,
        patientId: appointment.patient.id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: STATUS_TO_API[appointment.status],
        sessionType: appointment.sessionType || "online",
        clinicId: appointment.clinicId ?? null,
        roomId: appointment.roomId ?? null,
        type: appointment.type,
        isRecurring: appointment.isRecurring || false,
        notes: appointment.notes || "",
        meetingUrl: appointment.meetingUrl || "",
        reminderEnabled: appointment.reminderEnabled ?? false,
        reminderMinutesBefore: appointment.reminderMinutesBefore ?? undefined,
        reminderSentAt: appointment.reminderSentAt ?? null,
    };
}

export function toAppointmentPayload(values: AppointmentFormValues): AppointmentPayload {
    return {
        patientId: values.patientId,
        date: new Date(values.date),
        startTime: values.startTime,
        endTime: values.endTime,
        status: values.status,
        sessionType: values.sessionType,
        type: values.type,
        isRecurring: values.isRecurring,
        notes: values.notes,
        meetingUrl: values.meetingUrl || undefined,
        reminderEnabled: values.reminderEnabled,
        reminderMinutesBefore: values.reminderEnabled ? values.reminderMinutesBefore : undefined,
        allowScheduleConflicts: values.allowScheduleConflicts ?? false,
        roomId: values.roomId || null,
    };
}
