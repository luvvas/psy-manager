import { TIME_24H_REGEX } from "@/components/time-input";

/** Expediente do psicólogo (espelha `workScheduleSchema` da API). */
export type WorkShift = { start: string; end: string };

export interface WorkSchedule {
    sessionMinutes: number;
    bufferMinutes: number;
    /** Índice = dia da semana (0 = domingo … 6 = sábado). */
    days: WorkShift[][];
}

// Exibição de segunda a domingo; o índice guardado segue Date.getDay().
export const WEEK_ORDER: { day: number; label: string }[] = [
    { day: 1, label: "Segunda" },
    { day: 2, label: "Terça" },
    { day: 3, label: "Quarta" },
    { day: 4, label: "Quinta" },
    { day: 5, label: "Sexta" },
    { day: 6, label: "Sábado" },
    { day: 0, label: "Domingo" },
];

export const WEEKDAYS = [1, 2, 3, 4, 5];

const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};
const toHHMM = (total: number) =>
    `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

/** Novo turno: 1h depois do fim do último, com 4h de duração (sem passar de 23:59). */
export function nextShift(shifts: WorkShift[]): WorkShift {
    const last = shifts[shifts.length - 1];
    const lastEnd = last && TIME_24H_REGEX.test(last.end) ? toMinutes(last.end) : 7 * 60;
    const start = Math.min(lastEnd + 60, 22 * 60);
    return { start: toHHMM(start), end: toHHMM(Math.min(start + 4 * 60, 23 * 60 + 59)) };
}

export function defaultWorkSchedule(): WorkSchedule {
    const workday = () => [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" },
    ];
    return {
        sessionMinutes: 50,
        bufferMinutes: 10,
        days: Array.from({ length: 7 }, (_, d) => (WEEKDAYS.includes(d) ? workday() : [])),
    };
}

/** Mensagem do primeiro problema encontrado, ou null se o expediente é válido. */
export function validateWorkSchedule(schedule: WorkSchedule): string | null {
    if (!Number.isInteger(schedule.sessionMinutes) || schedule.sessionMinutes < 10 || schedule.sessionMinutes > 240) {
        return "A duração da sessão deve ficar entre 10 e 240 minutos.";
    }
    if (!Number.isInteger(schedule.bufferMinutes) || schedule.bufferMinutes < 0 || schedule.bufferMinutes > 120) {
        return "O intervalo entre sessões deve ficar entre 0 e 120 minutos.";
    }
    for (const { day, label } of WEEK_ORDER) {
        for (const shift of schedule.days[day]) {
            if (!TIME_24H_REGEX.test(shift.start) || !TIME_24H_REGEX.test(shift.end)) {
                return `${label}: preencha os horários no formato HH:MM.`;
            }
            if (shift.start >= shift.end) {
                return `${label}: o fim do turno deve ser depois do início.`;
            }
        }
    }
    return null;
}
