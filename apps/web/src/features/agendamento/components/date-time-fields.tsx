import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/date-picker";
import { TimeInput } from "@/components/time-input";
import type { AppointmentFormValues } from "../appointment-schema";
import { FieldError } from "./form-select-field";

interface DateTimeFieldsProps {
    control: Control<AppointmentFormValues>;
    errors: FieldErrors<AppointmentFormValues>;
    disabled: boolean;
    onStartChange: (next: string, onChange: (v: string) => void) => void;
    onEndChange: (next: string, onChange: (v: string) => void) => void;
}

export function DateTimeFields({ control, errors, disabled, onStartChange, onEndChange }: DateTimeFieldsProps) {
    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor="date">Data</Label>
                <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                        <DatePicker date={field.value} setDate={field.onChange} id="date" disabled={disabled} />
                    )}
                />
                <FieldError message={errors.date?.message} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                    <Label htmlFor="startTime">Início</Label>
                    <Controller
                        name="startTime"
                        control={control}
                        render={({ field }) => (
                            <TimeInput
                                id="startTime"
                                disabled={disabled}
                                {...field}
                                onChange={(v) => onStartChange(v, field.onChange)}
                            />
                        )}
                    />
                    <FieldError message={errors.startTime?.message} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="endTime">Fim</Label>
                    <Controller
                        name="endTime"
                        control={control}
                        render={({ field }) => (
                            <TimeInput
                                id="endTime"
                                disabled={disabled}
                                {...field}
                                onChange={(v) => onEndChange(v, field.onChange)}
                            />
                        )}
                    />
                    <FieldError message={errors.endTime?.message} />
                </div>
            </div>
        </>
    );
}
