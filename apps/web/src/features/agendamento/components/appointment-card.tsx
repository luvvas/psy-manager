import {
    Tooltip,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { Clock, DoorOpen, Repeat } from "lucide-react";
import type { Appointment } from "../types";
import { APPOINTMENT_TYPE_LABELS } from "../types";
import { isVideoCallAvailable } from "../lib/time";
import { StatusBadge } from "./status-badge";
import { VideoCallButton } from "./video-call-button";
import { cn } from "@/lib/utils";

interface AppointmentCardProps {
    appointment: Appointment;
    compact?: boolean;
}

const TYPE_DOT_COLORS: Record<Appointment["type"], string> = {
    individual: "bg-emerald-500",
    casal: "bg-violet-500",
    infantil: "bg-amber-500",
    avaliacao: "bg-sky-500",
};

export function AppointmentCard({ appointment, compact }: AppointmentCardProps) {
    const isOthers = !appointment.isMine;
    const canStartVideo =
        appointment.sessionType === "online" &&
        appointment.isMine &&
        isVideoCallAvailable(appointment.date, appointment.startTime, appointment.endTime);

    if (compact) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] leading-tight cursor-pointer transition-colors hover:bg-accent group/pill",
                            isOthers && "text-muted-foreground opacity-60 grayscale"
                        )}
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
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side="right"
                        sideOffset={6}
                        className="z-50 w-64 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
                    >
                        <AppointmentDetails appointment={appointment} isOthers={isOthers} />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </Tooltip>
        );
    }

    return (
        <div
            className={cn(
                "group cursor-pointer rounded-lg p-3 transition-shadow",
                isOthers
                    ? "border border-dashed bg-muted/60 text-muted-foreground opacity-75 grayscale hover:opacity-100"
                    : "bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 hover:shadow-lg"
            )}
            data-appointment-id={appointment.id}
        >
            <AppointmentDetails appointment={appointment} isOthers={isOthers} clampNotes />

            {canStartVideo && (
                <div className="mt-2 pt-2 border-t">
                    <VideoCallButton appointmentId={appointment.id} meetingUrl={appointment.meetingUrl} compact />
                </div>
            )}
        </div>
    );
}

interface AppointmentDetailsProps {
    appointment: Appointment;
    isOthers: boolean;
    clampNotes?: boolean;
}

function AppointmentDetails({ appointment, isOthers, clampNotes }: AppointmentDetailsProps) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium">{appointment.patient.name}</p>
                <StatusBadge status={appointment.status} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
                <span className={`size-1.5 shrink-0 rounded-full ${TYPE_DOT_COLORS[appointment.type]}`} />
                <p className="text-xs text-muted-foreground">{APPOINTMENT_TYPE_LABELS[appointment.type]}</p>
                {isOthers && appointment.psychologist && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium leading-none text-primary">
                        Psi: {appointment.psychologist.name}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {appointment.startTime} — {appointment.endTime}
                </span>
                {appointment.roomName && (
                    <span className="flex min-w-0 items-center gap-1">
                        <DoorOpen className="size-3 shrink-0" />
                        <span className="truncate">{appointment.roomName}</span>
                    </span>
                )}
                {appointment.isRecurring && (
                    <span className="flex items-center gap-1 text-primary/70">
                        <Repeat className="size-3" />
                        Semanal
                    </span>
                )}
            </div>
            {appointment.notes && (
                <p className={`border-t pt-1 text-xs italic text-muted-foreground/80 ${clampNotes ? "line-clamp-2" : ""}`}>
                    {appointment.notes}
                </p>
            )}
        </div>
    );
}
