export const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

export const FULL_DAY_LABEL_FORMAT = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});

export const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export const DAY_MONTH_SHORT_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

export const MONTH_SHORT_FORMAT = new Intl.DateTimeFormat("pt-BR", { month: "short" });

export function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
}

export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function dayKey(date: Date): string {
    return date.toISOString().split("T")[0];
}
