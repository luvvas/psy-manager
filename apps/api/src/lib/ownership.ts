import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { appointment, patient } from "../db/schema";

// IDs of related objects come straight from the client. A foreign key only
// proves the row exists, not that it belongs to the caller, so every write
// that references a patient or appointment checks ownership first (issue #36).

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
