import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Appointment } from "../types";
import { AppointmentCard } from "./appointment-card";

interface WeeklyViewProps {
    appointments: Appointment[];
    selectedDate: Date;
    onDayClick: (date: Date) => void;
}

const WEEKDAY_NAMES = [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
    "Domingo",
];

const WEEKDAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function formatDayNumber(date: Date): string {
    return date.getDate().toString().padStart(2, "0");
}

function formatMonthShort(date: Date): string {
    return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export function WeeklyView({ appointments, selectedDate, onDayClick }: WeeklyViewProps) {
    const monday = useMemo(() => getMonday(selectedDate), [selectedDate]);
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            return day;
        });
    }, [monday]);

    const groupedAppointments = useMemo(() => {
        const map = new Map<string, Appointment[]>();
        for (const day of weekDays) {
            const key = day.toISOString().split("T")[0];
            map.set(key, []);
        }
        for (const apt of appointments) {
            const key = new Date(apt.date).toISOString().split("T")[0];
            if (map.has(key)) {
                map.get(key)!.push(apt);
            }
        }
        for (const [, apts] of map) {
            apts.sort((a, b) => a.startTime.localeCompare(b.startTime));
        }
        return map;
    }, [appointments, weekDays]);

    return (
        <ScrollArea className="flex-1 h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-7 gap-px bg-border min-h-[400px] h-full">
                {weekDays.map((day, i) => {
                    const key = day.toISOString().split("T")[0];
                    const dayAppointments = groupedAppointments.get(key) || [];
                    const isToday = isSameDay(day, today);
                    const isWeekend = i >= 5;

                    return (
                        <div
                            key={key}
                            className={`flex flex-col bg-card transition-colors cursor-pointer ${isWeekend ? "hidden xl:flex" : ""
                                }`}
                            onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (!target.closest("[data-appointment-id]")) {
                                    onDayClick(day);
                                }
                            }}
                        >
                            {/* Day header */}
                            <div
                                className={`sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-2 backdrop-blur-sm ${isToday
                                    ? "bg-primary/5 border-b-primary/30"
                                    : "bg-card/95"
                                    }`}
                            >
                                <div
                                    className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${isToday
                                        ? "bg-primary text-primary-foreground"
                                        : "text-foreground"
                                        }`}
                                >
                                    {formatDayNumber(day)}
                                </div>
                                <div className="min-w-0">
                                    <p
                                        className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"
                                            }`}
                                    >
                                        <span className="hidden sm:inline">
                                            {WEEKDAY_NAMES[i]}
                                        </span>
                                        <span className="sm:hidden">{WEEKDAY_SHORT[i]}</span>
                                    </p>
                                    <p className="text-[10px] text-muted-foreground capitalize">
                                        {formatMonthShort(day)}
                                    </p>
                                </div>
                                {dayAppointments.length > 0 && (
                                    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                                        {dayAppointments.length}
                                    </span>
                                )}
                            </div>

                            {/* Appointments Container - fill height so borders go to bottom */}
                            <div className="flex-1 flex flex-col gap-2 p-2 min-h-[120px]">
                                {dayAppointments.length > 0 ? (
                                    dayAppointments.map((apt) => (
                                        <AppointmentCard key={apt.id} appointment={apt} />
                                    ))
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <p className="text-xs text-muted-foreground/40 select-none">
                                            Sem sessões
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
