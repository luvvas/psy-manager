import { z } from "zod";

/**
 * Expediente do psicólogo: turnos por dia da semana, duração padrão da sessão
 * e intervalo entre sessões. Funções puras (sem banco) para facilitar teste.
 */

export const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// O app é usado no Brasil. Datas chegam como meia-noite local (ou com hora),
// então o dia do agendamento é calculado neste fuso, independente do TZ do servidor.
export const APP_TIME_ZONE = "America/Sao_Paulo";

const shiftSchema = z
    .object({
        start: z.string().regex(TIME_HHMM, "Use HH:MM"),
        end: z.string().regex(TIME_HHMM, "Use HH:MM"),
    })
    .refine((s) => toMinutes(s.start) < toMinutes(s.end), "O fim do turno deve ser depois do início");

export const workScheduleSchema = z.object({
    sessionMinutes: z.number().int().min(10).max(240),
    bufferMinutes: z.number().int().min(0).max(120),
    // Índice = dia da semana (0 = domingo … 6 = sábado). Lista vazia = não atende.
    days: z.array(z.array(shiftSchema).max(6)).length(7),
});

export type WorkShift = { start: string; end: string };
export type WorkSchedule = z.infer<typeof workScheduleSchema>;

export interface BusyInterval {
    id: string;
    startTime: string;
    endTime: string;
}

export function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

export function toHHMM(total: number): string {
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Dia (AAAA-MM-DD) e dia da semana da data no fuso do app. */
export function localDay(date: Date): { key: string; weekday: number } {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: APP_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return { key: `${get("year")}-${get("month")}-${get("day")}`, weekday: weekdays.indexOf(get("weekday")) };
}

/** Minutos desde a meia-noite, agora, no fuso do app. */
export function nowLocalMinutes(now: Date = new Date()): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: APP_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(now);
    const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
    return get("hour") * 60 + get("minute");
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
    return aStart < bEnd && bStart < aEnd;
}

export function findConflicts<T extends BusyInterval>(startTime: string, endTime: string, busy: T[]): T[] {
    const s = toMinutes(startTime);
    const e = toMinutes(endTime);
    return busy.filter((b) => overlaps(s, e, toMinutes(b.startTime), toMinutes(b.endTime)));
}

/** true se o intervalo cabe inteiro em algum turno do dia. */
export function isWithinSchedule(schedule: WorkSchedule, weekday: number, startTime: string, endTime: string): boolean {
    const s = toMinutes(startTime);
    const e = toMinutes(endTime);
    return (schedule.days[weekday] ?? []).some((shift) => s >= toMinutes(shift.start) && e <= toMinutes(shift.end));
}

/**
 * Horários livres do dia: percorre cada turno em passos de sessão + intervalo,
 * pulando para depois de cada sessão já marcada que estiver no caminho.
 * `notBefore` (minutos) descarta horários que já passaram, para o dia de hoje.
 */
export function freeSlots(
    schedule: WorkSchedule,
    weekday: number,
    busy: BusyInterval[],
    notBefore = 0
): WorkShift[] {
    const { sessionMinutes, bufferMinutes } = schedule;
    const busyMin = busy.map((b) => ({ s: toMinutes(b.startTime), e: toMinutes(b.endTime) }));
    const slots: WorkShift[] = [];

    for (const shift of schedule.days[weekday] ?? []) {
        const shiftEnd = toMinutes(shift.end);
        let cursor = toMinutes(shift.start);

        while (cursor + sessionMinutes <= shiftEnd) {
            const end = cursor + sessionMinutes;
            const blocking = busyMin.filter((b) => overlaps(cursor, end, b.s, b.e));
            if (blocking.length > 0) {
                cursor = Math.max(...blocking.map((b) => b.e)) + bufferMinutes;
                continue;
            }
            if (cursor >= notBefore) {
                slots.push({ start: toHHMM(cursor), end: toHHMM(end) });
            }
            cursor = end + bufferMinutes;
        }
    }

    return slots;
}
