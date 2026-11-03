import * as React from "react";
import { Input } from "@/components/ui/input";

function maskTime(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalizeTime(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    let h: string;
    let m: string;
    if (digits.length <= 2) {
        h = digits;
        m = "00";
    } else if (digits.length === 3) {
        h = digits.slice(0, 1);
        m = digits.slice(1);
    } else {
        h = digits.slice(0, 2);
        m = digits.slice(2, 4);
    }
    return `${h.padStart(2, "0")}:${m.padEnd(2, "0")}`;
}

type TimeInputProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> & {
    value?: string;
    onChange?: (value: string) => void;
};

export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
    ({ value = "", onChange, onBlur, ...props }, ref) => (
        <Input
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:MM"
            maxLength={5}
            value={value}
            onChange={(e) => onChange?.(maskTime(e.target.value))}
            onBlur={(e) => {
                const normalized = normalizeTime(value);
                if (normalized !== value) onChange?.(normalized);
                onBlur?.(e);
            }}
            {...props}
        />
    ),
);
TimeInput.displayName = "TimeInput";

export const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
