import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, MapPin, Video } from "lucide-react";
import { StatusBadge } from "@/features/agendamento/components/status-badge";
import type { HomeSession } from "../types";
import { HomePanel } from "./home-panel";

interface UpcomingSessionsProps {
    isLoading?: boolean;
    sessions: HomeSession[];
    todayKey: string;
}

function dayLabel(dayKey: string, todayKey: string) {
    if (dayKey === todayKey) return "Hoje";
    return format(parseISO(dayKey), "EEE, dd 'de' MMM", { locale: ptBR });
}

export function UpcomingSessions({ sessions, todayKey, isLoading }: UpcomingSessionsProps) {
    return (
        <HomePanel
            isLoading={isLoading}
            title="Próximas sessões"
            description="Sessões de hoje em diante, por horário."
            action={{ label: "Ver agenda", to: "/agendamento" }}
            isEmpty={sessions.length === 0}
            empty={{
                icon: CalendarCheck,
                title: "Nenhuma sessão marcada",
                description: "Quando você agendar sessões, as próximas aparecem aqui.",
            }}
        >
            <ul className="divide-y">
                {sessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="w-24 shrink-0">
                            <p className="text-sm font-semibold tabular-nums">{s.startTime}</p>
                            <p className="text-xs capitalize text-muted-foreground">{dayLabel(s.dayKey, todayKey)}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{s.patientName}</p>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {s.sessionType === "in_person" ? (
                                    <>
                                        <MapPin className="size-3.5" /> Presencial
                                    </>
                                ) : (
                                    <>
                                        <Video className="size-3.5" /> Online
                                    </>
                                )}
                                <span>· até {s.endTime}</span>
                            </p>
                        </div>
                        <StatusBadge status={s.status} />
                    </li>
                ))}
            </ul>
        </HomePanel>
    );
}
