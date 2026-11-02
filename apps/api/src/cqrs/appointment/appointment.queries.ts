import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "../../db";
import { appointment, clinicRoom, patient, psychologistClinic, user } from "../../db/schema";
import { decryptField } from "../../lib/encryption";
import { decryptPatientSummary } from "../patient/patient.queries";

export const appointmentQueries = {
    async list(psychologistId: string) {
        const psychologistClinics = await db
            .select({ clinicId: psychologistClinic.clinicId })
            .from(psychologistClinic)
            .where(and(eq(psychologistClinic.psychologistId, psychologistId), eq(psychologistClinic.status, "active")));

        const clinicIds = psychologistClinics.map((c) => c.clinicId);

        // Own appointments — full data including patient PII
        const ownRows = await db
            .select({
                id: appointment.id,
                psychologistId: appointment.psychologistId,
                patientId: appointment.patientId,
                date: appointment.date,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                status: appointment.status,
                sessionType: appointment.sessionType,
                type: appointment.type,
                isRecurring: appointment.isRecurring,
                clinicId: appointment.clinicId,
                roomId: appointment.roomId,
                roomName: clinicRoom.name,
                notes: appointment.notes,
                meetingUrl: appointment.meetingUrl,
                reminderEnabled: appointment.reminderEnabled,
                reminderMinutesBefore: appointment.reminderMinutesBefore,
                reminderSentAt: appointment.reminderSentAt,
                createdAt: appointment.createdAt,
                updatedAt: appointment.updatedAt,
                patient: {
                    id: patient.id,
                    nome: patient.nome,
                    email: patient.email,
                    telefone: patient.telefone,
                },
                psychologist: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            })
            .from(appointment)
            .innerJoin(patient, eq(appointment.patientId, patient.id))
            .innerJoin(user, eq(appointment.psychologistId, user.id))
            .leftJoin(clinicRoom, eq(appointment.roomId, clinicRoom.id))
            .where(eq(appointment.psychologistId, psychologistId));

        const ownAppointments = ownRows.map((r) => ({
            ...r,
            isOwn: true as const,
            notes: decryptField(r.notes),
            patient: decryptPatientSummary(r.patient),
        }));

        if (clinicIds.length === 0) {
            return ownAppointments;
        }

        // Sessões de colegas: só as que ocupam uma sala das minhas clínicas. A agenda
        // compartilhada existe para coordenar o uso das salas; sessão online de casa
        // ou em consultório próprio não interessa à clínica e não deve aparecer.
        // Vale também para quem já saiu da clínica: a sala marcada continua ocupada.
        // Só dados do horário — dados do paciente nunca atravessam a fronteira de dono.
        const sharedRows = await db
            .select({
                id: appointment.id,
                psychologistId: appointment.psychologistId,
                date: appointment.date,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                status: appointment.status,
                sessionType: appointment.sessionType,
                type: appointment.type,
                isRecurring: appointment.isRecurring,
                clinicId: appointment.clinicId,
                roomId: appointment.roomId,
                roomName: clinicRoom.name,
                createdAt: appointment.createdAt,
                updatedAt: appointment.updatedAt,
                psychologist: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            })
            .from(appointment)
            .innerJoin(user, eq(appointment.psychologistId, user.id))
            .leftJoin(clinicRoom, eq(appointment.roomId, clinicRoom.id))
            .where(
                and(
                    inArray(appointment.clinicId, clinicIds),
                    isNotNull(appointment.roomId),
                    ne(appointment.psychologistId, psychologistId)
                )
            );

        const sharedAppointments = sharedRows.map((r) => ({
            ...r,
            patientId: null,
            isOwn: false as const,
            notes: null,
            meetingUrl: null,
            patient: null,
            reminderEnabled: false,
            reminderMinutesBefore: null,
            reminderSentAt: null,
        }));

        return [...ownAppointments, ...sharedAppointments];
    },
};

