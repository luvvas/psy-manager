import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Appointment } from "../types";
import { AppointmentCard } from "./appointment-card";

interface MonthlyViewProps {
    appointments: Appointment[];
    selectedDate: Date;
    onDayClick: (date: Date) => void;
}

const WEEKDAY_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function isSameMonth(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth()
    );
}

function getMonthGrid(date: Date): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    // getDay() is 0 (Sunday) to 6 (Saturday). We want Monday (1) to Sunday (0).
    // map Sunday to 6, and Monday-Saturday to 0-5.
    const rawDow = firstDay.getDay();
    const startDow = rawDow === 0 ? 6 : rawDow - 1;

    // Start from the Monday before (or on) the 1st
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startDow);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        days.push(d);
    }
    return days;
}

export function MonthlyView({ appointments, selectedDate, onDayClick }: MonthlyViewProps) {
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const gridDays = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);

    const groupedAppointments = useMemo(() => {
        const map = new Map<string, Appointment[]>();
        for (const apt of appointments) {
            const key = new Date(apt.date).toISOString().split("T")[0];
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(apt);
        }
        return map;
    }, [appointments]);

    return (
        <ScrollArea className="flex-1 rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="min-w-[600px] select-none">
                {/* Header days */}
                <div className="grid grid-cols-7 border-b bg-muted/40">
                    {WEEKDAY_HEADERS.map((day) => (
                        <div
                            key={day}
                            className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 border-l bg-card">
                    {gridDays.map((day) => {
                        const key = day.toISOString().split("T")[0];
                        const dayApts = groupedAppointments.get(key) || [];
                        const isToday = isSameDay(day, today);
                        const isCurrentMonth = isSameMonth(day, selectedDate);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                        return (
                            <div
                                key={key}
                                className={`relative flex min-h-[100px] flex-col border-b border-r p-1 transition-colors cursor-pointer hover:bg-accent/30 ${!isCurrentMonth ? "bg-muted/20" : ""
                                    } ${isWeekend && isCurrentMonth ? "bg-muted/10" : ""}`}
                                onClick={(e) => {
                                    const card = (e.target as HTMLElement).closest("[data-appointment-id]");
                                    if (!card) {
                                        onDayClick(day);
                                    }
                                }}
                            >
                                {/* Day number */}
                                <div className="flex items-center justify-between px-1">
                                    <span
                                        className={`flex size-6 items-center justify-center rounded-full text-xs transition-colors ${isToday
                                            ? "bg-primary text-primary-foreground font-bold"
                                            : isCurrentMonth
                                                ? "font-medium text-foreground"
                                                : "text-muted-foreground/50"
                                            }`}
                                    >
                                        {day.getDate()}
                                    </span>
                                    {dayApts.length > 0 && (
                                        <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                                            {dayApts.length}
                                        </span>
                                    )}
                                </div>

                                {/* Appointment pills */}
                                <div className="mt-0.5 flex flex-col gap-px overflow-hidden">
                                    {dayApts.slice(0, 3).map((apt) => (
                                        <AppointmentCard
                                            key={apt.id}
                                            appointment={apt}
                                            compact
                                        />
                                    ))}
                                    {dayApts.length > 3 && (
                                        <p className="px-1.5 text-[10px] font-medium text-muted-foreground">
                                            +{dayApts.length - 3} mais
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ScrollArea>
    );
}
