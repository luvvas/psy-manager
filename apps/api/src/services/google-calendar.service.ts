import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { account, patient, appointment, googleEventLink, user } from "../db/schema";
import { appointmentCommands } from "../cqrs/appointment/appointment.commands";
import { patientCommands } from "../cqrs/patient/patient.commands";
import { decryptField, encryptField } from "../lib/encryption";
import { assertPatientOwnership } from "../lib/ownership";
import { localDay, localTime } from "../lib/work-schedule";

const PROVIDER = "google";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const DEFAULT_REDIRECT_URI = "http://localhost:5173/google-callback";

interface GoogleEvent {
    id: string;
    summary?: string;
    description?: string;
    status?: string;
    recurringEventId?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
}

export interface PendingGoogleEvent {
    key: string;
    title: string;
    firstStart: Date;
    startTime: string;
    endTime: string;
    occurrences: number;
    recurring: boolean;
    suggestedPatientId: string | null;
}

export interface GoogleSyncResult {
    imported: number;
    updated: number;
    pending: PendingGoogleEvent[];
}

export interface GoogleEventDecision {
    key: string;
    patientId?: string | null;
    newPatientName?: string;
}

function notConnected() {
    return new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A Agenda do Google não está conectada. Conecte novamente para sincronizar.",
    });
}

function normalize(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

async function findAccount(userId: string) {
    const [row] = await db
        .select()
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, PROVIDER)));
    return row;
}

async function requestToken(params: Record<string, string>) {
    return fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            ...params,
        }),
    });
}

async function syncWindow(userId: string) {
    const [row] = await db
        .select({ back: user.googleSyncDaysBack, ahead: user.googleSyncDaysAhead })
        .from(user)
        .where(eq(user.id, userId));
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - (row?.back ?? 30));
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + (row?.ahead ?? 90));
    return { timeMin, timeMax };
}

async function fetchEvents(accessToken: string, { timeMin, timeMax }: { timeMin: Date; timeMax: Date }): Promise<GoogleEvent[]> {

    const url =
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
        new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "2500",
        });

    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
        console.error("[GoogleCalendar] Falha ao listar eventos, status:", response.status);
        throw new TRPCError({
            code: "BAD_GATEWAY",
            message: "Não foi possível ler a Agenda do Google. Tente novamente em instantes.",
        });
    }

    const data = await response.json();
    const items: GoogleEvent[] = data.items || [];
    return items.filter((e) => e.status !== "cancelled" && e.start?.dateTime && e.end?.dateTime);
}

async function patientNames(userId: string) {
    const rows = await db
        .select({ id: patient.id, nome: patient.nome, nomeSocial: patient.nomeSocial })
        .from(patient)
        .where(eq(patient.psychologistId, userId));
    return rows.flatMap((p) =>
        [decryptField(p.nome), decryptField(p.nomeSocial)]
            .filter((n): n is string => !!n && n.trim().length >= 3)
            .map((n) => ({ id: p.id, name: normalize(n) }))
    );
}

function suggestPatient(names: { id: string; name: string }[], event: GoogleEvent): string | null {
    const text = normalize(`${event.summary ?? ""} ${event.description ?? ""}`);
    const matches = names.filter((n) => text.includes(n.name)).sort((a, b) => b.name.length - a.name.length);
    return matches[0]?.id ?? null;
}

export const googleCalendarService = {
    async getValidTokens(userId: string): Promise<string | null> {
        const googleAccount = await findAccount(userId);
        const accessToken = decryptField(googleAccount?.accessToken);
        if (!googleAccount || !accessToken) return null;

        const now = new Date();
        const expiresAt = googleAccount.accessTokenExpiresAt;
        if (!expiresAt || now.getTime() < expiresAt.getTime() - 120 * 1000) return accessToken;

        const refreshToken = decryptField(googleAccount.refreshToken);
        if (!refreshToken) {
            console.warn("[GoogleCalendar] Refresh token ausente; não é possível renovar o acesso.");
            return null;
        }

        const response = await requestToken({ refresh_token: refreshToken, grant_type: "refresh_token" });
        if (!response.ok) {
            console.error("[GoogleCalendar] Falha ao renovar o token, status:", response.status);
            return null;
        }

        const data = await response.json();
        await db
            .update(account)
            .set({
                accessToken: encryptField(data.access_token),
                accessTokenExpiresAt: new Date(now.getTime() + data.expires_in * 1000),
                updatedAt: now,
            })
            .where(eq(account.id, googleAccount.id));
        return data.access_token;
    },

    async connect(userId: string, code: string): Promise<void> {
        const now = new Date();
        const response = await requestToken({
            code,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT_URI,
            grant_type: "authorization_code",
        });
        if (!response.ok) {
            console.error("[GoogleCalendar] Falha na troca do código OAuth, status:", response.status);
            throw new Error("Falha ao conectar com o Google Calendar. Tente novamente.");
        }

        const data = await response.json();
        const accessToken = encryptField(data.access_token);
        const refreshToken = encryptField(data.refresh_token);
        const accessTokenExpiresAt = new Date(now.getTime() + data.expires_in * 1000);
        const existing = await findAccount(userId);

        if (existing) {
            await db
                .update(account)
                .set({
                    accessToken,
                    refreshToken: refreshToken ?? existing.refreshToken,
                    accessTokenExpiresAt,
                    updatedAt: now,
                })
                .where(eq(account.id, existing.id));
            return;
        }

        await db.insert(account).values({
            id: crypto.randomUUID(),
            accountId: userId,
            providerId: PROVIDER,
            userId,
            accessToken,
            refreshToken,
            accessTokenExpiresAt,
            createdAt: now,
            updatedAt: now,
        });
    },

    async disconnect(userId: string): Promise<void> {
        const googleAccount = await findAccount(userId);
        if (googleAccount) {
            const token = decryptField(googleAccount.refreshToken) ?? decryptField(googleAccount.accessToken);
            if (token) {
                try {
                    const response = await fetch(REVOKE_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({ token }),
                    });
                    if (!response.ok) console.warn("[GoogleCalendar] Revogação recusada, status:", response.status);
                } catch (err) {
                    console.warn("[GoogleCalendar] Falha ao revogar o token:", err);
                }
            }
            await db.delete(account).where(eq(account.id, googleAccount.id));
        }
        await db.delete(googleEventLink).where(eq(googleEventLink.psychologistId, userId));
    },

    async syncEvents(userId: string): Promise<GoogleSyncResult> {
        const accessToken = await this.getValidTokens(userId);
        if (!accessToken) throw notConnected();

        const events = await fetchEvents(accessToken, await syncWindow(userId));
        const result: GoogleSyncResult = { imported: 0, updated: 0, pending: [] };
        if (events.length === 0) return result;

        const links = new Map<string, string | null>(
            (
                await db
                    .select({ googleKey: googleEventLink.googleKey, patientId: googleEventLink.patientId })
                    .from(googleEventLink)
                    .where(eq(googleEventLink.psychologistId, userId))
            ).map((l) => [l.googleKey, l.patientId])
        );

        const existingByEventId = new Map(
            (
                await db
                    .select()
                    .from(appointment)
                    .where(
                        and(
                            eq(appointment.psychologistId, userId),
                            inArray(appointment.googleEventId, events.map((e) => e.id))
                        )
                    )
            ).map((a) => [a.googleEventId!, a])
        );

        let names: { id: string; name: string }[] | null = null;
        const pending = new Map<string, PendingGoogleEvent>();

        for (const event of events) {
            const key = event.recurringEventId ?? event.id;
            const start = new Date(event.start!.dateTime!);
            const startTime = localTime(start);
            const endTime = localTime(new Date(event.end!.dateTime!));
            const existing = existingByEventId.get(event.id);

            if (existing) {
                if (!links.has(key)) {
                    await db
                        .insert(googleEventLink)
                        .values({ id: crypto.randomUUID(), psychologistId: userId, googleKey: key, patientId: existing.patientId })
                        .onConflictDoNothing();
                    links.set(key, existing.patientId);
                }
                const changed =
                    localDay(existing.date).key !== localDay(start).key ||
                    existing.startTime !== startTime ||
                    existing.endTime !== endTime;
                if (changed) {
                    await appointmentCommands.reschedule({
                        id: existing.id,
                        psychologistId: userId,
                        patientId: existing.patientId,
                        date: start,
                        startTime,
                        endTime,
                        status: existing.status,
                        sessionType: existing.sessionType,
                        type: existing.type,
                        isRecurring: existing.isRecurring,
                        notes: decryptField(existing.notes) ?? undefined,
                        meetingUrl: existing.meetingUrl ?? undefined,
                        googleEventId: event.id,
                        clinicId: existing.clinicId,
                        roomId: existing.roomId,
                        reminderEnabled: existing.reminderEnabled,
                        reminderMinutesBefore: existing.reminderMinutesBefore ?? undefined,
                    });
                    result.updated++;
                }
                continue;
            }

            if (links.has(key)) {
                const patientId = links.get(key);
                if (!patientId) continue;
                await appointmentCommands.schedule({
                    psychologistId: userId,
                    patientId,
                    date: start,
                    startTime,
                    endTime,
                    status: "confirmed",
                    sessionType: "online",
                    type: "individual",
                    isRecurring: !!event.recurringEventId,
                    notes: `Importado do Google Agenda: ${event.summary || "Sem título"}`,
                    googleEventId: event.id,
                });
                result.imported++;
                continue;
            }

            const group = pending.get(key);
            if (group) {
                group.occurrences++;
                continue;
            }
            names ??= await patientNames(userId);
            pending.set(key, {
                key,
                title: event.summary || "Sem título",
                firstStart: start,
                startTime,
                endTime,
                occurrences: 1,
                recurring: !!event.recurringEventId,
                suggestedPatientId: suggestPatient(names, event),
            });
        }

        result.pending = [...pending.values()];
        return result;
    },

    async resolveEvents(userId: string, decisions: GoogleEventDecision[]): Promise<GoogleSyncResult> {
        for (const decision of decisions) {
            let patientId: string | null = null;
            if (decision.newPatientName) {
                patientId = await patientCommands.create({ nome: decision.newPatientName.trim(), psychologistId: userId });
            } else if (decision.patientId) {
                await assertPatientOwnership(decision.patientId, userId);
                patientId = decision.patientId;
            }
            await db
                .insert(googleEventLink)
                .values({ id: crypto.randomUUID(), psychologistId: userId, googleKey: decision.key, patientId })
                .onConflictDoUpdate({
                    target: [googleEventLink.psychologistId, googleEventLink.googleKey],
                    set: { patientId },
                });
        }
        return this.syncEvents(userId);
    },

    async isConnected(userId: string): Promise<boolean> {
        return !!(await findAccount(userId));
    },
};
