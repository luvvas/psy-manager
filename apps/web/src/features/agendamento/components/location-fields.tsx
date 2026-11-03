import { Controller, type Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ANY_ROOM, NO_CLINIC, type AppointmentFormValues } from "../appointment-schema";
import type { ClinicWithRooms } from "../hooks/use-slot-availability";

interface LocationFieldsProps {
    control: Control<AppointmentFormValues>;
    sessionType: AppointmentFormValues["sessionType"];
    clinics: ClinicWithRooms[];
    selectedClinic: ClinicWithRooms | null;
    disabled: boolean;
    onClinicChange: (next: string, onChange: (v: string) => void) => void;
}

export function LocationFields({
    control,
    sessionType,
    clinics,
    selectedClinic,
    disabled,
    onClinicChange,
}: LocationFieldsProps) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="grid min-w-0 gap-2">
                <Label htmlFor="clinicId">Local</Label>
                <Controller
                    name="clinicId"
                    control={control}
                    render={({ field }) => (
                        <Select
                            value={field.value}
                            onValueChange={(v) => onClinicChange(v, field.onChange)}
                            disabled={disabled}
                        >
                            <SelectTrigger id="clinicId" className="w-full min-w-0">
                                <SelectValue placeholder="Local" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_CLINIC}>
                                    {sessionType === "online" ? "Sem sala (remoto)" : "Consultório próprio"}
                                </SelectItem>
                                {clinics.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
            {selectedClinic && (
                <div className="grid min-w-0 gap-2">
                    <Label htmlFor="roomId">Sala</Label>
                    <Controller
                        name="roomId"
                        control={control}
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                                <SelectTrigger id="roomId" className="w-full min-w-0">
                                    <SelectValue placeholder="Sala" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ANY_ROOM}>Qualquer sala livre</SelectItem>
                                    {selectedClinic.rooms.map((room) => (
                                        <SelectItem key={room.id} value={room.id}>
                                            {room.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            )}
        </div>
    );
}
