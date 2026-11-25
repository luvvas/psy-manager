import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_REMINDER_MINUTES, reminderOptions } from "@/lib/reminder";

interface ReminderSettingsProps {
    idPrefix: string;
    title: string;
    description: string;
    enabled: boolean;
    minutesBefore: number | null | undefined;
    onEnabledChange: (enabled: boolean) => void;
    onMinutesBeforeChange: (minutes: number) => void;
    disabled?: boolean;
    children?: ReactNode;
}

export function ReminderSettings({
    idPrefix,
    title,
    description,
    enabled,
    minutesBefore,
    onEnabledChange,
    onMinutesBeforeChange,
    disabled,
    children,
}: ReminderSettingsProps) {
    const minutes = minutesBefore ?? DEFAULT_REMINDER_MINUTES;
    const switchId = `${idPrefix}Enabled`;
    const selectId = `${idPrefix}MinutesBefore`;

    return (
        <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                    <Label htmlFor={switchId} className="flex items-center gap-1.5 text-sm font-medium">
                        <Bell className="size-3.5" />
                        {title}
                    </Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch id={switchId} checked={enabled} onCheckedChange={onEnabledChange} disabled={disabled} />
            </div>

            {enabled && (
                <div className="grid gap-2">
                    <Label htmlFor={selectId}>Enviar</Label>
                    <Select
                        value={String(minutes)}
                        onValueChange={(v) => onMinutesBeforeChange(Number(v))}
                        disabled={disabled}
                    >
                        <SelectTrigger id={selectId}>
                            <SelectValue placeholder="Quando enviar" />
                        </SelectTrigger>
                        <SelectContent>
                            {reminderOptions(minutes).map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {children}
        </div>
    );
}
