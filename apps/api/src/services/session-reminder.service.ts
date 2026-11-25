import { and, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { client, db } from "../db";
import { appointment, patient, user } from "../db/schema";
import { appointmentCommands } from "../cqrs/appointment/appointment.commands";
import { decryptField } from "../lib/encryption";
import { localDateTime } from "../lib/work-schedule";
import { MAX_REMINDER_MINUTES, isReminderDue } from "../lib/reminder";
import { emailService } from "./email.service";

export const REMINDER_LOCK_KEY = 7_391_204_518;
export const REMINDER_INTERVAL_MS = 60_000;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DueReminder {
    id: string;
    date: Date;
    startTime: string;
    startsAt: Date;
    sessionType: string;
    meetingUrl: string | null;
    patientEmail: string | null;
    psychologistName: string;
}

export interface ReminderCycleResult {
    locked: boolean;
    sent: number;
    failed: number;
    notConfigured: number;
    withoutEmail: number;
    skipped: number;
}

const warnedOnce = new Map<string, number>();

function warnOnce(key: string, until: Date, message: string) {
    if (warnedOnce.has(key)) return;
    warnedOnce.set(key, until.getTime());
    console.warn(message);
}

function pruneWarnings(now: Date) {
    for (const [key, until] of warnedOnce) {
        if (until <= now.getTime()) warnedOnce.delete(key);
    }
}

async function findDueReminders(now: Date): Promise<DueReminder[]> {
    const rows = await db
        .select({
            id: appointment.id,
            date: appointment.date,
            startTime: appointment.startTime,
            sessionType: appointment.sessionType,
            meetingUrl: appointment.meetingUrl,
            reminderMinutesBefore: appointment.reminderMinutesBefore,
            patientEmail: patient.email,
            psychologistName: user.name,
        })
        .from(appointment)
        .innerJoin(patient, eq(patient.id, appointment.patientId))
        .innerJoin(user, eq(user.id, appointment.psychologistId))
        .where(
            and(
                eq(appointment.reminderEnabled, true),
                isNull(appointment.reminderSentAt),
                ne(appointment.status, "cancelled"),
                gte(appointment.date, new Date(now.getTime() - 2 * DAY_MS)),
                lte(appointment.date, new Date(now.getTime() + MAX_REMINDER_MINUTES * 60_000 + 2 * DAY_MS))
            )
        );

    return rows
        .map((row) => ({ ...row, startsAt: localDateTime(row.date, row.startTime) }))
        .filter((row) => isReminderDue(row.startsAt, row.reminderMinutesBefore, now))
        .map(({ reminderMinutesBefore: _minutes, ...row }) => row);
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

async function deliver(reminder: DueReminder, now: Date, result: ReminderCycleResult) {
    const to = decryptField(reminder.patientEmail)?.trim();
    if (!to) {
        result.withoutEmail++;
        return;
    }

    try {
        await appointmentCommands.assertReminderSendable(reminder);
    } catch (err) {
        result.skipped++;
        warnOnce(
            `skip:${reminder.id}`,
            reminder.startsAt,
            `[lembrete] Lembrete do agendamento ${reminder.id} não enviado: ${errorMessage(err)}`
        );
        return;
    }

    let outcome;
    try {
        outcome = await emailService.sendSessionReminder({
            to,
            psychologistName: reminder.psychologistName,
            startsAt: reminder.startsAt,
            sessionType: reminder.sessionType,
            meetingUrl: reminder.meetingUrl,
        });
    } catch (err) {
        result.failed++;
        console.error(`[lembrete] Falha ao enviar o lembrete do agendamento ${reminder.id}: ${errorMessage(err)}`);
        return;
    }

    if (outcome !== "sent") {
        result.notConfigured++;
        warnOnce(
            `smtp:${reminder.id}`,
            reminder.startsAt,
            `[email] SMTP não configurado. Lembrete do agendamento ${reminder.id} (sessão em ${reminder.startsAt.toISOString()}) não enviado.`
        );
        return;
    }

    try {
        await appointmentCommands.markReminderSent({
            id: reminder.id,
            sentAt: now,
            date: reminder.date,
            startTime: reminder.startTime,
        });
        result.sent++;
    } catch (err) {
        result.failed++;
        console.error(`[lembrete] Lembrete do agendamento ${reminder.id} enviado, mas não foi registrado: ${errorMessage(err)}`);
    }
}

export const sessionReminderService = {
    findDueReminders,

    async runCycle(now: Date = new Date()): Promise<ReminderCycleResult> {
        const result: ReminderCycleResult = {
            locked: false,
            sent: 0,
            failed: 0,
            notConfigured: 0,
            withoutEmail: 0,
            skipped: 0,
        };
        const connection = await client.reserve();
        try {
            const [lock] = await connection<{ locked: boolean }[]>`select pg_try_advisory_lock(${REMINDER_LOCK_KEY}) as locked`;
            if (!lock?.locked) {
                return result;
            }
            result.locked = true;
            try {
                pruneWarnings(now);
                for (const reminder of await findDueReminders(now)) {
                    await deliver(reminder, now, result);
                }
            } finally {
                await connection`select pg_advisory_unlock(${REMINDER_LOCK_KEY})`;
            }
            return result;
        } finally {
            connection.release();
        }
    },

    start(): () => void {
        if (!emailService.isConfigured()) {
            console.warn("[lembrete] SMTP não configurado: os lembretes de sessão só serão registrados no log.");
        }
        let running = false;
        const tick = async () => {
            if (running) return;
            running = true;
            try {
                await sessionReminderService.runCycle();
            } catch (err) {
                console.error(`[lembrete] Ciclo de lembretes falhou: ${errorMessage(err)}`);
            } finally {
                running = false;
            }
        };
        void tick();
        const timer = setInterval(tick, REMINDER_INTERVAL_MS);
        return () => clearInterval(timer);
    },
};
