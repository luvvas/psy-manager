import { CalendarDays, CalendarRange, TrendingUp, Users } from "lucide-react";
import { StatsCards as GenericStatsCards } from "@/components/stats-cards";
import { formatCurrency } from "@/utils/format";

interface StatsCardsProps {
    sessionsToday: number;
    sessionsWeek: number;
    patientCount: number;
    monthIncome: number;
}

export function StatsCards({ sessionsToday, sessionsWeek, patientCount, monthIncome }: StatsCardsProps) {
    const stats = [
        {
            label: "Sessões hoje",
            value: sessionsToday,
            icon: CalendarDays,
            color: "text-emerald-600 bg-emerald-500/10",
        },
        {
            label: "Sessões na semana",
            value: sessionsWeek,
            icon: CalendarRange,
            color: "text-sky-600 bg-sky-500/10",
        },
        {
            label: "Pacientes",
            value: patientCount,
            icon: Users,
            color: "text-violet-600 bg-violet-500/10",
        },
        {
            label: "Receitas do mês",
            value: formatCurrency(monthIncome),
            icon: TrendingUp,
            color: "text-amber-600 bg-amber-500/10",
        },
    ];

    return <GenericStatsCards items={stats} />;
}
