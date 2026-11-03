import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    disabled?: boolean;
}

const DISPLAY_FORMAT = "dd/MM/yyyy";
const MIN_YEAR = 1900;

function maskDate(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDate(text: string): Date | undefined {
    if (text.length !== 10) return undefined;
    const parsed = parse(text, DISPLAY_FORMAT, new Date());
    if (!isValid(parsed) || parsed.getFullYear() < MIN_YEAR) return undefined;
    return parsed;
}

export function DatePicker({ date, setDate, placeholder, className, id, disabled }: DatePickerProps) {
    const [text, setText] = useState(date ? format(date, DISPLAY_FORMAT) : "");
    const [open, setOpen] = useState(false);

    const [prevDate, setPrevDate] = useState(date);
    if (date?.getTime() !== prevDate?.getTime()) {
        setPrevDate(date);
        if (date) {
            setText(format(date, DISPLAY_FORMAT));
        } else if (parseDate(text)) {
            setText("");
        }
    }

    const handleTextChange = (value: string) => {
        const masked = maskDate(value);
        setText(masked);
        const parsed = parseDate(masked);
        if (parsed) {
            setDate(parsed);
        } else if (date) {
            setDate(undefined);
        }
    };

    const endYear = new Date().getFullYear() + 10;

    return (
        <div className={cn("relative w-full", className)}>
            <Input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                placeholder={placeholder || "dd/mm/aaaa"}
                value={text}
                disabled={disabled}
                onChange={(e) => handleTextChange(e.target.value)}
                className="pr-9"
            />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        aria-label="Abrir calendário"
                        className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                    >
                        <CalendarIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        selected={date}
                        defaultMonth={date}
                        onSelect={(selected) => {
                            setDate(selected);
                            setOpen(false);
                        }}
                        captionLayout="dropdown"
                        startMonth={new Date(MIN_YEAR, 0)}
                        endMonth={new Date(endYear, 11)}
                        autoFocus
                        locale={ptBR}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
