import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { appointment, patient, psychologistClinic, user } from "../../db/schema";
import { decryptField } from "../../lib/encryption";
import { decryptPatientSummary } from "../patient/patient.queries";

export const appointmentQueries = {
    async list(psychologistId: string) {
        const psychologistClinics = await db
            .select({ clinicId: psychologistClinic.clinicId })
            .from(psychologistClinic)
            .where(eq(psychologistClinic.psychologistId, psychologistId));

        const clinicIds = psychologistClinics.map((c) => c.clinicId);

        let sharedPsychologistIds: string[] = [];

        if (clinicIds.length > 0) {
            const sharedClinicsPsychologists = await db
                .select({ psychologistId: psychologistClinic.psychologistId })
                .from(psychologistClinic)
                .where(inArray(psychologistClinic.clinicId, clinicIds));

            sharedPsychologistIds = Array.from(
                new Set(
                    sharedClinicsPsychologists
                        .map((p) => p.psychologistId)
                        .filter((id) => id !== psychologistId)
                )
            );
        }

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
                notes: appointment.notes,
                meetingUrl: appointment.meetingUrl,
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
            .where(eq(appointment.psychologistId, psychologistId));

        const ownAppointments = ownRows.map((r) => ({
            ...r,
            isOwn: true as const,
            notes: decryptField(r.notes),
            patient: decryptPatientSummary(r.patient),
        }));

        if (sharedPsychologistIds.length === 0) {
            return ownAppointments;
        }

        // Shared clinic appointments — slot info only; patient data must never cross ownership boundaries
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
            .where(inArray(appointment.psychologistId, sharedPsychologistIds));

        const sharedAppointments = sharedRows.map((r) => ({
            ...r,
            patientId: null,
            isOwn: false as const,
            notes: null,
            meetingUrl: null,
            patient: null,
        }));

        return [...ownAppointments, ...sharedAppointments];
    },
};

