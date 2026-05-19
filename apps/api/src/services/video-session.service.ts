import { db } from "../db";
import { videoSession, user } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID, randomBytes, createHash } from "crypto";

function generatePatientToken(): string {
    return randomBytes(24).toString("base64url");
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
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
            patientToken: hashToken(patientToken), // store hash, not plaintext
            status: "pending",
            expiresAt,
        });

        return { id, patientToken }; // return original for URL
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
            .where(eq(videoSession.patientToken, hashToken(patientToken)));

        if (!s) return null;

        // Expose only the first name — enough for the patient join page UX
        // without disclosing the full name via a public, token-gated endpoint.
        return {
            ...s,
            psychologistName: s.psychologistName.split(" ")[0],
        };
    },
};
