import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimeInput } from "@/components/time-input";
import {
    defaultWorkSchedule,
    nextShift,
    WEEK_ORDER,
    WEEKDAYS,
    type WorkSchedule,
    type WorkShift,
} from "@/lib/work-schedule";
import { Copy, Plus, Trash2 } from "lucide-react";

interface WorkScheduleEditorProps {
    value: WorkSchedule | null;
    onChange: (value: WorkSchedule | null) => void;
}

export function WorkScheduleEditor({ value, onChange }: WorkScheduleEditorProps) {
    const enabled = value !== null;

    function updateDay(day: number, shifts: WorkShift[]) {
        if (!value) return;
        const days = value.days.map((s, i) => (i === day ? shifts : s));
        onChange({ ...value, days });
    }

    function copyMondayToWeekdays() {
        if (!value) return;
        const monday = value.days[1];
        onChange({
            ...value,
            days: value.days.map((s, i) => (WEEKDAYS.includes(i) ? monday.map((sh) => ({ ...sh })) : s)),
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                    <Label htmlFor="workScheduleEnabled" className="text-sm font-medium">
                        Usar meu expediente na agenda
                    </Label>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        A agenda sugere horários livres e avisa quando a sessão fica fora do expediente.
                    </p>
                </div>
                <Switch
                    id="workScheduleEnabled"
                    checked={enabled}
                    onCheckedChange={(on) => onChange(on ? defaultWorkSchedule() : null)}
                />
            </div>

            {value && (
                <>
                    <section>
                        <div className="flex gap-4">
                            <div className="w-28 shrink-0 space-y-2">
                                <Label htmlFor="sessionMinutes" className="whitespace-nowrap">
                                    Duração (min)
                                </Label>
                                <Input
                                    id="sessionMinutes"
                                    type="number"
                                    min={10}
                                    max={240}
                                    step={5}
                                    value={value.sessionMinutes}
                                    onChange={(e) => onChange({ ...value, sessionMinutes: Number(e.target.value) })}
                                />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                                <Label htmlFor="bufferMinutes" className="whitespace-nowrap">
                                    Intervalo entre sessões (min)
                                </Label>
                                <Input
                                    id="bufferMinutes"
                                    type="number"
                                    min={0}
                                    max={120}
                                    step={5}
                                    value={value.bufferMinutes}
                                    onChange={(e) => onChange({ ...value, bufferMinutes: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Dias e turnos</h3>
                                <p className="text-xs text-muted-foreground">
                                    Adicione mais de um turno para separar manhã e tarde.
                                </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copyMondayToWeekdays}>
                                <Copy className="size-4" />
                                Copiar segunda para os dias úteis
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {WEEK_ORDER.map(({ day, label }) => {
                                const shifts = value.days[day];
                                const works = shifts.length > 0;
                                return (
                                    <div key={day} className="rounded-lg border p-4">
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                id={`day-${day}`}
                                                checked={works}
                                                onCheckedChange={(on) =>
                                                    updateDay(day, on ? [{ start: "08:00", end: "12:00" }] : [])
                                                }
                                            />
                                            <Label htmlFor={`day-${day}`} className="text-sm font-medium">
                                                {label}
                                            </Label>
                                            <span className="ml-auto text-xs text-muted-foreground">
                                                {works
                                                    ? `${shifts.length} ${shifts.length === 1 ? "turno" : "turnos"}`
                                                    : "Não atende"}
                                            </span>
                                        </div>

                                        {works && (
                                            <div className="mt-4 space-y-3">
                                                {shifts.map((shift, i) => (
                                                    <div key={i} className="flex items-center gap-2 sm:gap-3">
                                                        <TimeInput
                                                            aria-label={`${label}, início do turno ${i + 1}`}
                                                            className="min-w-0 flex-1 text-center tabular-nums"
                                                            value={shift.start}
                                                            onChange={(start) =>
                                                                updateDay(day, shifts.map((s, j) => (j === i ? { ...s, start } : s)))
                                                            }
                                                        />
                                                        <span className="shrink-0 text-sm text-muted-foreground">até</span>
                                                        <TimeInput
                                                            aria-label={`${label}, fim do turno ${i + 1}`}
                                                            className="min-w-0 flex-1 text-center tabular-nums"
                                                            value={shift.end}
                                                            onChange={(end) =>
                                                                updateDay(day, shifts.map((s, j) => (j === i ? { ...s, end } : s)))
                                                            }
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="shrink-0 text-muted-foreground hover:text-destructive"
                                                            title="Remover turno"
                                                            aria-label={`Remover turno ${i + 1} de ${label}`}
                                                            onClick={() => updateDay(day, shifts.filter((_, j) => j !== i))}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {shifts.length < 6 && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full gap-1.5"
                                                        onClick={() => updateDay(day, [...shifts, nextShift(shifts)])}
                                                    >
                                                        <Plus className="size-4" />
                                                        Adicionar turno
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
