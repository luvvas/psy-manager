import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { trpc, type RouterInputs } from "@/lib/trpc";
import { formatCurrency } from "@/utils/format";

type PaymentMethod = RouterInputs["billing"]["registerPayment"]["method"];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
    { value: "pix", label: "Pix" },
    { value: "cartao", label: "Cartão" },
    { value: "transferencia", label: "Transferência / Boleto" },
    { value: "dinheiro", label: "Dinheiro" },
    { value: "outro", label: "Outro" },
];

const SESSION_DATE = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

interface RegisterPaymentFormProps {
    patientId: string;
    onDone: () => void;
    onCancel: () => void;
}

export function RegisterPaymentForm({ patientId, onDone, onCancel }: RegisterPaymentFormProps) {
    const utils = trpc.useUtils();
    const { data, isPending } = trpc.billing.patientStatement.useQuery({ patientId });
    const [picked, setPicked] = useState<Set<string> | null>(null);
    const [paidAt, setPaidAt] = useState<Date | undefined>(() => new Date());
    const [method, setMethod] = useState<PaymentMethod>("pix");

    const registerMutation = trpc.billing.registerPayment.useMutation({
        onSuccess: (result) => {
            toast.success(`Pagamento de ${formatCurrency(result.amount)} registrado com sucesso!`);
            utils.billing.invalidate();
            utils.financial.invalidate();
            onDone();
        },
        onError: (err) => toast.error(`Erro ao registrar pagamento: ${err.message}`),
    });

    const openCharges = (data?.charges ?? []).filter((c) => c.status === "open").toSorted(
        (a, b) => a.sessionDate.getTime() - b.sessionDate.getTime()
    );
    const selected = picked ?? new Set(openCharges.map((c) => c.id));
    let total = 0;
    for (const c of openCharges) if (selected.has(c.id)) total += c.amount;

    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setPicked(next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selected.size === 0) {
            toast.error("Selecione ao menos uma sessão.");
            return;
        }
        if (!paidAt) {
            toast.error("Informe a data do pagamento.");
            return;
        }
        registerMutation.mutate({ patientId, chargeIds: [...selected], paidAt, method });
    };

    const isSubmitting = registerMutation.isPending;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4 py-2">
            <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-sm font-medium">{data?.patient.nome ?? "Paciente"}</p>
                    <p className="text-xs text-muted-foreground">Marque as sessões que este pagamento quita.</p>
                </div>

                <div className="rounded-lg border divide-y">
                    {isPending ? (
                        <div className="p-3 space-y-2">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-2/3" />
                        </div>
                    ) : openCharges.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma sessão em aberto.</p>
                    ) : (
                        openCharges.map((c) => (
                            <label key={c.id} className="flex items-center gap-3 p-3 text-sm cursor-pointer hover:bg-muted/40">
                                <input
                                    type="checkbox"
                                    className="size-4 accent-primary"
                                    checked={selected.has(c.id)}
                                    onChange={() => toggle(c.id)}
                                    disabled={isSubmitting}
                                />
                                <span className="flex-1">Sessão de {SESSION_DATE.format(c.sessionDate)}</span>
                                <span className="font-medium">{formatCurrency(c.amount)}</span>
                            </label>
                        ))
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="paidAt">Data do pagamento</Label>
                        <DatePicker id="paidAt" date={paidAt} setDate={setPaidAt} disabled={isSubmitting} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="method">Forma de pagamento</Label>
                        <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} disabled={isSubmitting}>
                            <SelectTrigger id="method" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {METHOD_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                    <span className="text-sm text-muted-foreground">Total recebido</span>
                    <span className="text-lg font-semibold">{formatCurrency(total)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    O pagamento entra como receita recebida no Financeiro, vinculada ao paciente.
                </p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || selected.size === 0}>
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Registrar pagamento
                </Button>
            </div>
        </form>
    );
}
