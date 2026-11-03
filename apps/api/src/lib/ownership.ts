import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { appointment, clinicRoom, patient, psychologistClinic } from "../db/schema";

export async function assertPatientOwnership(patientId: string, psychologistId: string) {
    const [row] = await db
        .select({ id: patient.id })
        .from(patient)
        .where(and(eq(patient.id, patientId), eq(patient.psychologistId, psychologistId)))
        .limit(1);
    if (!row) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Paciente não encontrado." });
    }
}

export async function assertAppointmentOwnership(appointmentId: string, psychologistId: string) {
    const [row] = await db
        .select({ id: appointment.id })
        .from(appointment)
        .where(and(eq(appointment.id, appointmentId), eq(appointment.psychologistId, psychologistId)))
        .limit(1);
    if (!row) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Agendamento não encontrado." });
    }
}

export async function assertRoomAccess(roomId: string, psychologistId: string) {
    const [row] = await db
        .select({ id: clinicRoom.id, clinicId: clinicRoom.clinicId, name: clinicRoom.name })
        .from(clinicRoom)
        .innerJoin(
            psychologistClinic,
            and(
                eq(psychologistClinic.clinicId, clinicRoom.clinicId),
                eq(psychologistClinic.psychologistId, psychologistId),
                eq(psychologistClinic.status, "active")
            )
        )
        .where(and(eq(clinicRoom.id, roomId), eq(clinicRoom.active, true)))
        .limit(1);
    if (!row) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sala não encontrada." });
    }
    return row;
}

export async function assertClinicMembership(clinicId: string, psychologistId: string) {
    const [row] = await db
        .select({ id: psychologistClinic.id })
        .from(psychologistClinic)
        .where(
            and(
                eq(psychologistClinic.clinicId, clinicId),
                eq(psychologistClinic.psychologistId, psychologistId),
                eq(psychologistClinic.status, "active")
            )
        )
        .limit(1);
    if (!row) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clínica não encontrada." });
    }
}
