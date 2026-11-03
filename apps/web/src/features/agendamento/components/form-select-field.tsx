import { Controller, type Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { AppointmentFormValues, SelectOption } from "../appointment-schema";

type SelectFieldName = "patientId" | "type" | "sessionType" | "status";

interface FormSelectFieldProps {
    control: Control<AppointmentFormValues>;
    name: SelectFieldName;
    label: string;
    placeholder: string;
    options: readonly SelectOption[];
    disabled: boolean;
    emptyLabel?: string;
    error?: string;
}

export function FormSelectField({
    control,
    name,
    label,
    placeholder,
    options,
    disabled,
    emptyLabel,
    error,
}: FormSelectFieldProps) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                        <SelectTrigger id={name}>
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                            {emptyLabel && options.length === 0 && (
                                <SelectItem value="no-options" disabled>
                                    {emptyLabel}
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                )}
            />
            <FieldError message={error} />
        </div>
    );
}

export function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-xs text-destructive">{message}</p>;
}
