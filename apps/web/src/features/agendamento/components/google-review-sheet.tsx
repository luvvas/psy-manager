import { useState } from "react";
import { AppSheet } from "@/components/layout/app-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { trpc, type RouterInputs, type RouterOutputs } from "@/lib/trpc";
import { useResolveGoogleEvents } from "../hooks/use-appointment-mutations";

type GoogleSyncResult = RouterOutputs["appointment"]["syncGoogle"];
type PendingEvent = GoogleSyncResult["pending"][number];
type Decision = RouterInputs["appointment"]["resolveGoogleEvents"]["decisions"][number];

const LATER = "__later";
const IGNORE = "__ignore";
const NEW_PATIENT = "__new";

interface Choice {
    value: string;
    newName: string;
}

interface GoogleReviewSheetProps {
    pending: PendingEvent[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResolved: (result: GoogleSyncResult) => void;
}

function initialChoices(pending: PendingEvent[]): Record<string, Choice> {
    return Object.fromEntries(
        pending.map((p) => [p.key, { value: p.suggestedPatientId ?? LATER, newName: p.title }])
    );
}

function whenLabel(event: PendingEvent): string {
    const day = event.firstStart.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
    return `${day} · ${event.startTime}–${event.endTime}`;
}

export function GoogleReviewSheet({ pending, open, onOpenChange, onResolved }: GoogleReviewSheetProps) {
    const { data: patients } = trpc.patient.list.useQuery(undefined, { enabled: open });
    const [choices, setChoices] = useState(() => initialChoices(pending));
    const resolve = useResolveGoogleEvents(onResolved);

    const decisions = pending.flatMap((p): Decision[] => {
        const choice = choices[p.key];
        if (!choice || choice.value === LATER) return [];
        if (choice.value === IGNORE) return [{ key: p.key, patientId: null }];
        if (choice.value === NEW_PATIENT) {
            const name = choice.newName.trim();
            return name ? [{ key: p.key, newPatientName: name }] : [];
        }
        return [{ key: p.key, patientId: choice.value }];
    });

    function update(key: string, patch: Partial<Choice>) {
        setChoices((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    }

    return (
        <AppSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Revisar eventos do Google"
            description="Escolha a paciente de cada evento. Eventos recorrentes são decididos uma vez para a série inteira, e o que você ignorar não aparece de novo."
        >
            <div className="flex flex-col gap-3">
                {pending.map((event) => {
                    const choice = choices[event.key];
                    return (
                        <div key={event.key} className="flex flex-col gap-2 rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 break-words text-sm font-medium">{event.title}</p>
                                {event.occurrences > 1 && (
                                    <Badge variant="secondary" className="shrink-0">
                                        {event.occurrences} sessões
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">{whenLabel(event)}</p>
                            <div className="grid gap-2">
                                <Select value={choice?.value ?? LATER} onValueChange={(value) => update(event.key, { value })}>
                                    <SelectTrigger aria-label={`Paciente de ${event.title}`} className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={LATER}>Decidir depois</SelectItem>
                                        <SelectItem value={IGNORE}>
                                            {event.recurring ? "Ignorar a série" : "Ignorar evento"}
                                        </SelectItem>
                                        <SelectItem value={NEW_PATIENT}>Cadastrar nova paciente</SelectItem>
                                        {patients && patients.length > 0 && <SelectSeparator />}
                                        {patients?.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {choice?.value === NEW_PATIENT && (
                                    <Input
                                        aria-label="Nome da nova paciente"
                                        value={choice.newName}
                                        onChange={(e) => update(event.key, { newName: e.target.value })}
                                        placeholder="Nome da paciente"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-background py-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Fechar
                </Button>
                <Button
                    onClick={() => resolve.mutate({ decisions })}
                    disabled={decisions.length === 0 || resolve.isPending}
                    id="btn-google-review-save"
                >
                    {resolve.isPending ? "Importando..." : `Salvar ${decisions.length} ${decisions.length === 1 ? "decisão" : "decisões"}`}
                </Button>
            </div>
        </AppSheet>
    );
}
