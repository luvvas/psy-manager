import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import type { Appointment } from "../types";
import { AppointmentCard } from "./appointment-card";

interface DailyListViewProps {
    appointments: Appointment[];
    selectedDate: Date;
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function DailyView({
    appointments,
    selectedDate,
}: DailyListViewProps) {
    const dayAppointments = useMemo(() => {
        return appointments
            .filter((a) => isSameDay(new Date(a.date), selectedDate))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [appointments, selectedDate]);

    const formattedDate = selectedDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium capitalize">{formattedDate}</h3>
                    <p className="text-xs text-muted-foreground">
                        {dayAppointments.length}{" "}
                        {dayAppointments.length === 1 ? "sessão agendada" : "sessões agendadas"}
                    </p>
                </div>
            </div>

            <Separator />

            {/* overflow-y-auto em vez de ScrollArea, e p-1.5 para a borda (ring) e a
                sombra dos cartões não serem cortadas nas laterais pelo contêiner. */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {dayAppointments.length > 0 ? (
                    <div className="flex flex-col gap-2 p-1.5">
                        {dayAppointments.map((apt) => (
                            <AppointmentCard key={apt.id} appointment={apt} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-sm text-muted-foreground">
                            Nenhuma sessão agendada para este dia.
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Clique em "Novo Agendamento" para adicionar.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
