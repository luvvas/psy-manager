import { Ban, DoorOpen, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SlotCheck } from "../hooks/use-slot-availability";

interface RoomWarningProps {
    check: SlotCheck;
    startTime: string;
    roomBlocked: boolean;
    showError: boolean;
    disabled: boolean;
    onPickRoom: (roomId: string) => void;
}

export function RoomWarning({ check, startTime, roomBlocked, showError, disabled, onPickRoom }: RoomWarningProps) {
    const noFreeRoom = check.freeRooms?.length === 0;
    return (
        <div
            role={roomBlocked ? "alert" : undefined}
            className={cn(
                "space-y-2 rounded-lg border p-3",
                roomBlocked || showError || noFreeRoom ? "border-destructive/50 bg-destructive/5" : "bg-muted/40"
            )}
        >
            {roomBlocked ? (
                <div className="flex gap-2 text-xs">
                    <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div className="space-y-1">
                        <p>
                            O horário das <strong>{startTime}</strong> não está livre nesta sala.
                        </p>
                        {check.roomConflicts.map((c) => (
                            <p key={c.id} className="text-muted-foreground">
                                Ocupada das {c.startTime} às {c.endTime}
                                {c.isOwn ? " por outra sessão sua" : ` por ${c.psychologistName}`}.
                            </p>
                        ))}
                    </div>
                </div>
            ) : noFreeRoom ? (
                <p className="flex gap-2 text-xs">
                    <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span>
                        O horário das <strong>{startTime}</strong> não está livre: todas as salas estão
                        ocupadas. Escolha outro horário.
                    </span>
                </p>
            ) : (
                <p className="flex items-center gap-2 text-xs">
                    <DoorOpen className="size-4 shrink-0 text-muted-foreground" />
                    Escolha a sala para este horário.
                </p>
            )}
            {check.freeRooms && check.freeRooms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                        {roomBlocked ? "Outras salas livres" : "Salas livres"} às {startTime}:
                    </span>
                    {check.freeRooms.map((room) => (
                        <Button
                            key={room.id}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={disabled}
                            onClick={() => onPickRoom(room.id)}
                        >
                            {room.name}
                        </Button>
                    ))}
                </div>
            )}
            {showError && (
                <p className="text-xs text-destructive">
                    {roomBlocked
                        ? "A sala está ocupada: escolha outra sala ou outro horário para salvar."
                        : "Escolha a sala para salvar."}
                </p>
            )}
        </div>
    );
}

interface ScheduleWarningProps {
    check: SlotCheck;
    startTime: string;
    confirmed: boolean;
    showError: boolean;
    disabled: boolean;
    onConfirmedChange: (confirmed: boolean) => void;
}

export function ScheduleWarning({
    check,
    startTime,
    confirmed,
    showError,
    disabled,
    onConfirmedChange,
}: ScheduleWarningProps) {
    return (
        <div
            role="alert"
            className={cn(
                "space-y-2 rounded-lg border p-3 text-sm",
                showError ? "border-destructive/50 bg-destructive/5" : "border-amber-500/40 bg-amber-500/10"
            )}
        >
            <div className="flex gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div className="space-y-1 text-xs">
                    {check.conflicts.length > 0 && (
                        <>
                            <p>
                                O horário das <strong>{startTime}</strong> não está livre na sua agenda.
                            </p>
                            {check.conflicts.map((c) => (
                                <p key={c.id} className="text-muted-foreground">
                                    Você já tem sessão das {c.startTime} às {c.endTime}
                                    {c.patientName ? ` com ${c.patientName}` : ""}.
                                </p>
                            ))}
                        </>
                    )}
                    {check.outsideSchedule && <p>Este horário está fora do seu expediente.</p>}
                </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium">
                <Switch checked={confirmed} onCheckedChange={onConfirmedChange} disabled={disabled} />
                Agendar mesmo assim
            </label>
            {showError && (
                <p className="text-xs text-destructive">Confirme acima ou escolha outro horário para salvar.</p>
            )}
        </div>
    );
}
