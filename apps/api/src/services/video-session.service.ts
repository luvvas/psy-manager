import { db } from "../db";
import { videoSession, user } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID, randomBytes } from "crypto";

function generatePatientToken(): string {
    return randomBytes(24).toString("base64url");
}

export const videoSessionService = {
    async create(psychologistId: string, appointmentId?: string) {
        const id = randomUUID();
        const patientToken = generatePatientToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await db.insert(videoSession).values({
            id,
            psychologistId,
            appointmentId: appointmentId ?? null,
            patientToken,
            status: "pending",
            expiresAt,
        });

        return { id, patientToken };
    },

    async getById(psychologistId: string, id: string) {
        const [s] = await db
            .select()
            .from(videoSession)
            .where(
                and(
                    eq(videoSession.id, id),
                    eq(videoSession.psychologistId, psychologistId)
                )
            );
        return s ?? null;
    },

    async end(psychologistId: string, id: string) {
        await db
            .update(videoSession)
            .set({ status: "ended", endedAt: new Date() })
            .where(
                and(
                    eq(videoSession.id, id),
                    eq(videoSession.psychologistId, psychologistId)
                )
            );
        return { success: true };
    },

    async validateToken(patientToken: string) {
        const [s] = await db
            .select({
                id: videoSession.id,
                status: videoSession.status,
                expiresAt: videoSession.expiresAt,
                psychologistName: user.name,
            })
            .from(videoSession)
            .innerJoin(user, eq(videoSession.psychologistId, user.id))
            .where(eq(videoSession.patientToken, patientToken));
        return s ?? null;
    },
};
