import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { appointment, patient, psychologistClinic, user } from "../../db/schema";

export const appointmentQueries = {
    async list(psychologistId: string) {
        // Find clinics of the current psychologist
        const psychologistClinics = await db
            .select({ clinicId: psychologistClinic.clinicId })
            .from(psychologistClinic)
            .where(eq(psychologistClinic.psychologistId, psychologistId));

        const clinicIds = psychologistClinics.map((c) => c.clinicId);

        let sharedPsychologistIds = [psychologistId];

        if (clinicIds.length > 0) {
            const sharedClinicsPsychologists = await db
                .select({ psychologistId: psychologistClinic.psychologistId })
                .from(psychologistClinic)
                .where(inArray(psychologistClinic.clinicId, clinicIds));

            sharedPsychologistIds = Array.from(
                new Set([
                    psychologistId,
                    ...sharedClinicsPsychologists.map((p) => p.psychologistId),
                ])
            );
        }

        return db
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
            .where(inArray(appointment.psychologistId, sharedPsychologistIds));
    },
};

