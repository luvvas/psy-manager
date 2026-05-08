import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, UserCheck, AlertCircle } from "lucide-react";
import type { Appointment } from "../types";

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

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
                <Card key={stat.label} className="py-0 overflow-hidden">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${stat.color}`}
                        >
                            <stat.icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                            <p className="text-xs text-muted-foreground truncate">
                                {stat.label}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
