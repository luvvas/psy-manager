import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { account, patient, appointment } from "../db/schema";
import { appointmentCommands } from "../cqrs/appointment/appointment.commands";

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
            console.log(`🔌 No Google Account linked for psychologist: ${userId}`);
            return null;
        }

        const now = new Date();
        const expiresAt = googleAccount.accessTokenExpiresAt;

        // Check if access token is expired or expires in the next 2 minutes
        if (expiresAt && now.getTime() >= expiresAt.getTime() - 120 * 1000) {
            console.log(`🔄 Google Access Token expired for user ${userId}. Refreshing...`);
            if (!googleAccount.refreshToken) {
                console.log(`⚠️ Refresh token missing for user ${userId}`);
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

                console.log(`✅ Google Access Token refreshed successfully for user ${userId}`);
                return newAccessToken;
            } catch (err) {
                console.error(`❌ Failed to refresh Google token:`, err);
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

            // Check if this event is already imported in our read-model
            const [existing] = await db
                .select()
                .from(appointment)
                .where(eq(appointment.googleEventId, googleEventId));

            if (existing) {
                skipped++;
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

            const startDate = new Date(start);
            const endDate = new Date(end);

            const startTime = startDate.toTimeString().split(" ")[0].substring(0, 5); // "HH:MM"
            const endTime = endDate.toTimeString().split(" ")[0].substring(0, 5); // "HH:MM"

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
