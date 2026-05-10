import { CalendarDays, Clock, UserCheck, AlertCircle } from "lucide-react";
import type { Appointment } from "../types";
import { StatsCards as GenericStatsCards } from "@/components/stats-cards";

interface StatsCardsProps {
    appointments: Appointment[];
}

export function StatsCards({ appointments }: StatsCardsProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAppointments = appointments.filter((a) => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    });

    const totalWeek = appointments.length;
    const confirmed = appointments.filter((a) => a.status === "confirmado").length;
    const pending = appointments.filter((a) => a.status === "pendente").length;

    const stats = [
        {
            label: "Sessões hoje",
            value: todayAppointments.length,
            icon: CalendarDays,
            color: "text-emerald-600 bg-emerald-500/10",
        },
        {
            label: "Total na semana",
            value: totalWeek,
            icon: Clock,
            color: "text-sky-600 bg-sky-500/10",
        },
        {
            label: "Confirmadas",
            value: confirmed,
            icon: UserCheck,
            color: "text-violet-600 bg-violet-500/10",
        },
        {
            label: "Pendentes",
            value: pending,
            icon: AlertCircle,
            color: "text-amber-600 bg-amber-500/10",
        },
    ];

    return <GenericStatsCards items={stats} />;
}
