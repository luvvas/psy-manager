export const DEFAULT_REMINDER_MINUTES = 1440;

const PRESET_MINUTES = [30, 60, 120, 180, 360, 720, 1440, 2880];

export function reminderLabel(minutes: number): string {
    if (minutes % 1440 === 0) {
        const days = minutes / 1440;
        return days === 1 ? "24 horas antes" : `${days * 24} horas antes`;
    }
    if (minutes % 60 === 0) {
        const hours = minutes / 60;
        return hours === 1 ? "1 hora antes" : `${hours} horas antes`;
    }
    return `${minutes} minutos antes`;
}

export function reminderOptions(current?: number | null): { value: string; label: string }[] {
    const minutes = current && !PRESET_MINUTES.includes(current) ? [...PRESET_MINUTES, current].sort((a, b) => a - b) : PRESET_MINUTES;
    return minutes.map((m) => ({ value: String(m), label: reminderLabel(m) }));
}
