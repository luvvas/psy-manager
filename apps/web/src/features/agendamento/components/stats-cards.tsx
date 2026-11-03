import { CalendarDays, Clock, UserCheck, AlertCircle } from "lucide-react";
import type { Appointment } from "../types";
import { getMonday, isSameDay } from "../lib/dates";
import { StatsCards as GenericStatsCards } from "@/components/stats-cards";

interface StatsCardsProps {
    /** Só as sessões da psicóloga logada (sem as de colegas da clínica). */
    appointments: Appointment[];
    /** A semana dos cards é a da data selecionada no calendário. */
    selectedDate: Date;
}

export function StatsCards({ appointments, selectedDate }: StatsCardsProps) {
    const today = new Date();
    const weekStart = getMonday(selectedDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    let todayCount = 0;
    let weekCount = 0;
    let confirmed = 0;
    let pending = 0;
    for (const a of appointments) {
        if (a.status === "cancelado") continue;
        const date = new Date(a.date);
        if (isSameDay(date, today)) todayCount++;
        if (date < weekStart || date >= weekEnd) continue;
        weekCount++;
        if (a.status === "confirmado") confirmed++;
        else if (a.status === "pendente") pending++;
    }

    const stats = [
        {
            label: "Sessões hoje",
            value: todayCount,
            icon: CalendarDays,
            color: "text-emerald-600 bg-emerald-500/10",
        },
        {
            label: "Total na semana",
            value: weekCount,
            icon: Clock,
            color: "text-sky-600 bg-sky-500/10",
        },
        {
            label: "Confirmadas na semana",
            value: confirmed,
            icon: UserCheck,
            color: "text-violet-600 bg-violet-500/10",
        },
        {
            label: "Pendentes na semana",
            value: pending,
            icon: AlertCircle,
            color: "text-amber-600 bg-amber-500/10",
        },
    ];

    return <GenericStatsCards items={stats} />;
}
