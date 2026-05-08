import { Card } from "@/components/ui/card";
import { Clock, Repeat, MessageSquare } from "lucide-react";
import type { Appointment } from "../types";
import { APPOINTMENT_TYPE_LABELS } from "../types";
import { StatusBadge } from "./status-badge";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";

interface AppointmentCardProps {
    appointment: Appointment;
    compact?: boolean;
}

const TYPE_COLORS: Record<Appointment["type"], string> = {
    individual: "border-l-emerald-500",
    casal: "border-l-violet-500",
    infantil: "border-l-amber-500",
    avaliacao: "border-l-sky-500",
};

const TYPE_DOT_COLORS: Record<Appointment["type"], string> = {
    individual: "bg-emerald-500",
    casal: "bg-violet-500",
    infantil: "bg-amber-500",
    avaliacao: "bg-sky-500",
};

export function AppointmentCard({ appointment, compact }: AppointmentCardProps) {
    const { data: session } = useSession();
    const isOthers = session?.user?.id !== appointment.psychologistId;

    if (compact) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] leading-tight cursor-pointer transition-colors hover:bg-accent group/pill"
                        data-appointment-id={appointment.id}
                    >
                        <span
                            className={`size-1.5 shrink-0 rounded-full ${TYPE_DOT_COLORS[appointment.type]}`}
                        />
                        <span className="truncate font-medium">
                            {appointment.startTime}
                        </span>
                        <span className="truncate text-muted-foreground hidden sm:inline">
                            {appointment.patient.name.split(" ")[0]}
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[240px]">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-sm">{appointment.patient.name}</p>
                            <StatusBadge status={appointment.status} />
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <p className="text-xs text-muted-foreground">
                                {APPOINTMENT_TYPE_LABELS[appointment.type]}
                            </p>
                            {isOthers && appointment.psychologist && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary leading-none">
                                    Psi: {appointment.psychologist.name}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {appointment.startTime} — {appointment.endTime}
                        </div>
                        {appointment.notes && (
                            <p className="text-xs text-muted-foreground/80 italic border-t pt-1">
                                {appointment.notes}
                            </p>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Card
            className="group relative cursor-pointer border-l-[3px] p-3 transition-all hover:shadow-md hover:bg-accent/50 gap-0"
            style={{ borderLeftColor: undefined }}
            data-appointment-id={appointment.id}
        >
            <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-md ${TYPE_COLORS[appointment.type].replace("border-l-", "bg-")}`} />

            {/* Header: Patient + Status */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">
                            {appointment.patient.name}
                        </p>
                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{APPOINTMENT_TYPE_LABELS[appointment.type]}</span>
                            {isOthers && appointment.psychologist && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary leading-none whitespace-nowrap">
                                    Psi: {appointment.psychologist.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <StatusBadge status={appointment.status} />
            </div>

            {/* Time */}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {appointment.startTime} — {appointment.endTime}
                </span>
                {appointment.isRecurring && (
                    <span className="flex items-center gap-1 text-primary/70">
                        <Repeat className="size-3" />
                        Semanal
                    </span>
                )}
                {appointment.notes && (
                    <span className="flex items-center gap-1">
                        <MessageSquare className="size-3" />
                        Nota
                    </span>
                )}
            </div>

            {/* Notes preview */}
            {appointment.notes && (
                <p className="mt-1.5 text-[11px] text-muted-foreground/80 line-clamp-1 italic">
                    {appointment.notes}
                </p>
            )}
        </Card>
    );
}
