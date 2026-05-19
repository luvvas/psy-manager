import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { account, patient, appointment } from "../db/schema";
import { appointmentCommands } from "../cqrs/appointment/appointment.commands";
import { decryptField } from "../lib/encryption";

export const googleCalendarService = {
    /**
     * Retrieves the Google OAuth tokens for a psychologist, refreshing them if they are expired.
     */
    async getValidTokens(userId: string): Promise<string | null> {
        const [googleAccount] = await db
            .select()
            .from(account)
            .where(
                and(
                    eq(account.userId, userId),
                    eq(account.providerId, "google")
                )
            );

        if (!googleAccount || !googleAccount.accessToken) {
            console.log("[GoogleCalendar] No linked account found.");
            return null;
        }

        const now = new Date();
        const expiresAt = googleAccount.accessTokenExpiresAt;

        // Check if access token is expired or expires in the next 2 minutes
        if (expiresAt && now.getTime() >= expiresAt.getTime() - 120 * 1000) {
            if (!googleAccount.refreshToken) {
                console.warn("[GoogleCalendar] Refresh token missing — cannot renew access token.");
                return null;
            }

            try {
                const response = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: process.env.GOOGLE_CLIENT_ID || "",
                        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                        refresh_token: googleAccount.refreshToken,
                        grant_type: "refresh_token",
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Token refresh failed: ${response.statusText}`);
                }

                const data = await response.json();
                const newAccessToken = data.access_token;
                const newExpiresIn = data.expires_in;
                const newExpiresAt = new Date(now.getTime() + newExpiresIn * 1000);

                await db
                    .update(account)
                    .set({
                        accessToken: newAccessToken,
                        accessTokenExpiresAt: newExpiresAt,
                        updatedAt: now,
                    })
                    .where(eq(account.id, googleAccount.id));

                console.log("[GoogleCalendar] Access token refreshed.");
                return newAccessToken;
            } catch (err) {
                console.error("[GoogleCalendar] Failed to refresh access token:", err);
                return null;
            }
        }

        return googleAccount.accessToken;
    },

    /**
     * Synchronizes events from the psychologist's primary Google Calendar.
     */
    async syncEvents(userId: string): Promise<{ imported: number; skipped: number }> {
        const accessToken = await this.getValidTokens(userId);
        if (!accessToken) {
            throw new Error("No connected Google Calendar account found.");
        }

        // TODO: HERE THE DATE THAT WILL BE SYNCED IS FIXED 1 MONTH EARLIER AND 3 MONTHS LATER
        // Fetch events from the last 30 days and the next 90 days
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 90);

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` + new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
        });

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Google Calendar API error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const googleEvents = data.items || [];

        let imported = 0;
        let skipped = 0;

        // Get all patients under this psychologist to match them with events
        const myPatients = await db
            .select()
            .from(patient)
            .where(eq(patient.psychologistId, userId));

        for (const event of googleEvents) {
            const googleEventId = event.id;
            const title = event.summary || "Consulta sem Título";
            const start = event.start?.dateTime || event.start?.date;
            const end = event.end?.dateTime || event.end?.date;

            if (!start || !end) continue;

            const startDate = new Date(start);
            const endDate = new Date(end);
            const startTime = startDate.toTimeString().split(" ")[0].substring(0, 5);
            const endTime = endDate.toTimeString().split(" ")[0].substring(0, 5);

            // Check if this event is already imported — only look at own appointments
            const [existing] = await db
                .select()
                .from(appointment)
                .where(
                    and(
                        eq(appointment.googleEventId, googleEventId),
                        eq(appointment.psychologistId, userId)
                    )
                );

            if (existing) {
                // Update if date or time changed
                const existingDateStr = new Date(existing.date).toISOString().split("T")[0];
                const newDateStr = startDate.toISOString().split("T")[0];
                const timeChanged =
                    existingDateStr !== newDateStr ||
                    existing.startTime !== startTime ||
                    existing.endTime !== endTime;

                if (timeChanged) {
                    await appointmentCommands.reschedule({
                        id: existing.id,
                        psychologistId: userId,
                        patientId: existing.patientId,
                        date: startDate,
                        startTime,
                        endTime,
                        status: existing.status,
                        sessionType: existing.sessionType,
                        type: existing.type,
                        isRecurring: existing.isRecurring,
                        notes: decryptField(existing.notes) ?? undefined,
                        googleEventId,
                    });
                    imported++;
                } else {
                    skipped++;
                }
                continue;
            }

            // Find a patient matching the title or description
            const matchedPatient = myPatients.find(
                (p) =>
                    title.toLowerCase().includes(p.nome.toLowerCase()) ||
                    event.description?.toLowerCase().includes(p.nome.toLowerCase())
            );

            // Skip events with no matching patient instead of creating a fake record
            if (!matchedPatient) {
                skipped++;
                continue;
            }

            await appointmentCommands.schedule({
                psychologistId: userId,
                patientId: matchedPatient!.id,
                date: startDate,
                startTime,
                endTime,
                status: "confirmed",
                sessionType: "online",
                type: "individual",
                isRecurring: false,
                notes: `Importado do Google Calendar.\n\nTítulo original: ${title}\nDescrição: ${event.description || ""}`,
                googleEventId,
            });

            imported++;
        }

        return { imported, skipped };
    },

    /**
     * Checks if the psychologist has connected Google Calendar.
     */
    async isConnected(userId: string): Promise<boolean> {
        const [googleAccount] = await db
            .select()
            .from(account)
            .where(
                and(
                    eq(account.userId, userId),
                    eq(account.providerId, "google")
                )
            );
        return !!googleAccount;
    },
};
