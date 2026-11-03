import { useCallback, useMemo, useState } from "react";
import type { ViewMode } from "../components/calendar-dashboard";
import { DAY_LABEL_FORMAT, DAY_MONTH_SHORT_FORMAT, MONTH_LABEL_FORMAT, getMonday } from "../lib/dates";

function formatWeekRange(date: Date): string {
    const monday = getMonday(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${DAY_MONTH_SHORT_FORMAT.format(monday)} — ${DAY_MONTH_SHORT_FORMAT.format(sunday)}`;
}

function formatDateLabel(date: Date, view: ViewMode): string {
    switch (view) {
        case "semana":
            return formatWeekRange(date);
        case "mes":
            return MONTH_LABEL_FORMAT.format(date);
        case "dia":
            return DAY_LABEL_FORMAT.format(date);
    }
}

function shiftDate(date: Date, view: ViewMode, direction: -1 | 1): Date {
    const d = new Date(date);
    switch (view) {
        case "semana":
            d.setDate(d.getDate() + direction * 7);
            break;
        case "mes":
            d.setMonth(d.getMonth() + direction);
            break;
        case "dia":
            d.setDate(d.getDate() + direction);
            break;
    }
    return d;
}

export function useCalendarNavigation(initialView: ViewMode = "semana") {
    const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
    const [view, setView] = useState<ViewMode>(initialView);

    const dateLabel = useMemo(() => formatDateLabel(selectedDate, view), [selectedDate, view]);

    const navigate = useCallback(
        (direction: -1 | 1) => setSelectedDate((prev) => shiftDate(prev, view, direction)),
        [view]
    );

    const goToToday = useCallback(() => setSelectedDate(new Date()), []);

    return { selectedDate, setSelectedDate, view, setView, dateLabel, navigate, goToToday };
}
