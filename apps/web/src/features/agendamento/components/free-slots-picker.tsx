import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FreeSlot, FreeSlots } from "../hooks/use-slot-availability";

interface FreeSlotsPickerProps {
    free: FreeSlots;
    inClinic: boolean;
    hasSelectedRoom: boolean;
    startTime: string;
    endTime: string;
    disabled: boolean;
    onPick: (slot: FreeSlot) => void;
}

function pickerLabel(inClinic: boolean, hasSelectedRoom: boolean): string {
    if (!inClinic) return "Horários livres neste dia";
    return hasSelectedRoom ? "Horários livres seus e da sala" : "Horários livres seus com sala disponível";
}

export function FreeSlotsPicker({
    free,
    inClinic,
    hasSelectedRoom,
    startTime,
    endTime,
    disabled,
    onPick,
}: FreeSlotsPickerProps) {
    return (
        <div className="grid gap-2">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {pickerLabel(inClinic, hasSelectedRoom)}
            </Label>
            {!free.configured ? (
                <p className="text-xs text-muted-foreground">
                    Configure seu expediente em Perfil → Expediente para ver os horários livres aqui.
                </p>
            ) : free.slots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    {inClinic
                        ? "Nenhum horário do seu expediente com sala livre neste dia."
                        : "Nenhum horário livre no expediente deste dia."}
                </p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {free.slots.map((slot) => {
                        const selected = slot.start === startTime && slot.end === endTime;
                        return (
                            <button
                                key={slot.start}
                                type="button"
                                disabled={disabled}
                                onClick={() => onPick(slot)}
                                aria-pressed={selected}
                                title={
                                    inClinic && slot.rooms.length > 0
                                        ? `Livre: ${slot.rooms.map((r) => r.name).join(", ")}`
                                        : undefined
                                }
                                className={cn(
                                    "rounded-md border px-2 py-1 text-xs font-medium tabular-nums transition-colors",
                                    selected
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "hover:border-primary hover:text-primary"
                                )}
                            >
                                {slot.start}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
