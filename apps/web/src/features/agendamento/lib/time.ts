export const DEFAULT_SESSION_MINUTES = 50;

const VIDEO_CALL_MARGIN_MINUTES = 15;

export function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

export function toHHMM(total: number): string {
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function endFor(startTime: string, minutes: number): string {
    return toHHMM(Math.min(toMinutes(startTime) + minutes, 23 * 60 + 59));
}

export function defaultTimeRange(): { startTime: string; endTime: string } {
    const now = new Date();
    const startTime = toHHMM(now.getHours() * 60 + now.getMinutes());
    return { startTime, endTime: endFor(startTime, DEFAULT_SESSION_MINUTES) };
}

function atTime(date: Date, hhmm: string, offsetMinutes: number): Date {
    const [h, m] = hhmm.split(":").map(Number);
    const result = new Date(date);
    result.setHours(h, m, 0, 0);
    result.setMinutes(result.getMinutes() + offsetMinutes);
    return result;
}

export function isVideoCallAvailable(date: Date, startTime: string, endTime: string): boolean {
    const now = new Date();
    return (
        now >= atTime(date, startTime, -VIDEO_CALL_MARGIN_MINUTES) &&
        now <= atTime(date, endTime, VIDEO_CALL_MARGIN_MINUTES)
    );
}
