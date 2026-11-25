export const DEFAULT_REMINDER_MINUTES = 1440;
export const MAX_REMINDER_MINUTES = 7 * 24 * 60;

export function isReminderDue(startsAt: Date, minutesBefore: number | null, now: Date): boolean {
    const before = (minutesBefore ?? DEFAULT_REMINDER_MINUTES) * 60_000;
    return startsAt.getTime() > now.getTime() && startsAt.getTime() - before <= now.getTime();
}
