import { Ban, CheckCircle2, Clock, HandCoins, MessageCircle, Printer, Receipt, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatsCards } from "@/components/stats-cards";
import { AppSheet } from "@/components/layout/app-sheet";
import { RegisterPaymentForm } from "@/components/billing/register-payment-form";
import { useSendCharge } from "@/components/billing/use-send-charge";
import { paymentMethodLabel, printReceipt, professionalAddress } from "@/components/billing/receipt";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { formatCurrency } from "@/utils/format";

type Statement = RouterOutputs["billing"]["patientStatement"];
type Charge = Statement["charges"][number];
type Payment = Statement["payments"][number];

const DATE = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function payerOf(p: Statement["patient"]) {
    if (p.responsavelFinanceiroTipo === "responsavel" && p.respLegalNome) {
        return { name: p.respLegalNome, cpf: p.respLegalCpf };
    }
    if (p.responsavelFinanceiroTipo === "outro" && p.responsavelFinanceiroDetalhe) {
        return { name: p.responsavelFinanceiroDetalhe, cpf: null };
    }
    return { name: p.nome ?? "", cpf: p.cpf };
}

function ChargeStatusBadge({ charge }: { charge: Charge }) {
    if (charge.status === "paid") {
        return (
            <Badge className="gap-1 font-medium bg-emerald-500/15 text-emerald-700 shadow-none border-transparent">
                <CheckCircle2 className="size-3" />
                Pago{charge.paidAt ? ` em ${DATE.format(charge.paidAt)}` : ""}
            </Badge>
        );
    }
    if (charge.status === "waived") {
        return (
            <Badge variant="secondary" className="gap-1 font-medium">
                <Ban className="size-3" />
                Abonado
            </Badge>
        );
    }
    const overdue = charge.dueDate < startOfToday();
    return (
        <Badge
            variant="outline"
            className={`gap-1 font-medium ${overdue ? "text-rose-700 border-rose-200 bg-rose-50" : "text-amber-700 border-amber-200 bg-amber-50"}`}
        >
            <Clock className="size-3" />
            {overdue ? "Vencido" : "Em aberto"}
        </Badge>
    );
}

function openBalance(charges: Charge[]) {
    let total = 0;
    let count = 0;
    for (const c of charges) {
        if (c.status !== "open") continue;
        total += c.amount;
        count++;
    }
    return { total, count };
}

interface PatientBillingActionsProps {
    patientId: string;
    onRegister: () => void;
}

export function PatientBillingActions({ patientId, onRegister }: PatientBillingActionsProps) {
    const sendCharge = useSendCharge();
    const { data } = trpc.billing.patientStatement.useQuery({ patientId });
    const { total, count } = openBalance(data?.charges ?? []);

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="gap-1.5 hidden sm:flex"
                disabled={count === 0}
                onClick={() =>
                    sendCharge({
                        patientName: data?.patient.nome ?? "",
                        telefone: data?.patient.telefone ?? null,
                        openCount: count,
                        total,
                    })
                }
            >
                <MessageCircle className="size-4" />
                Cobrar no WhatsApp
            </Button>
            <Button size="sm" className="gap-1.5" disabled={count === 0} onClick={onRegister}>
                <HandCoins className="size-4" />
                Registrar pagamento
            </Button>
        </>
    );
}

interface PatientBillingProps {
    patientId: string;
    isPaying: boolean;
    onPayingChange: (open: boolean) => void;
}

export function PatientBilling({ patientId, isPaying, onPayingChange }: PatientBillingProps) {
    const utils = trpc.useUtils();
    const { data, isPending } = trpc.billing.patientStatement.useQuery({ patientId });
    const { data: me } = trpc.psychologist.me.useQuery();

    const waiveMutation = trpc.billing.waiveCharge.useMutation({
        onSuccess: () => {
            toast.success("Cobrança abonada com sucesso!");
            utils.billing.invalidate();
        },
        onError: (err) => toast.error(`Erro ao abonar: ${err.message}`),
    });

    const undoMutation = trpc.billing.undoPayment.useMutation({
        onSuccess: () => {
            toast.success("Pagamento desfeito com sucesso! As sessões voltaram para em aberto.");
            utils.billing.invalidate();
            utils.financial.invalidate();
        },
        onError: (err) => toast.error(`Erro ao desfazer pagamento: ${err.message}`),
    });

    const charges = data?.charges ?? [];
    const payments = data?.payments ?? [];
    const { total: openTotal, count: openCount } = openBalance(charges);
    let paidTotal = 0;
    for (const c of charges) if (c.status === "paid") paidTotal += c.amount;

    const handleReceipt = (p: Payment) => {
        if (!data) return;
        const payer = payerOf(data.patient);
        const ok = printReceipt({
            payerName: payer.name,
            payerCpf: payer.cpf,
            patientName: data.patient.nome ?? "",
            amount: p.amount,
            paidAt: p.paidAt,
            method: p.method,
            sessionDates: charges.filter((c) => c.paymentId === p.id).map((c) => c.sessionDate),
            psychologistName: me?.name ?? "",
            psychologistCpf: me?.cpf,
            crp: me?.crp,
            city: me?.city,
            address: me ? professionalAddress(me) : null,
        });
        if (ok && !me?.cpf) toast.info("Cadastre seu CPF no perfil para ele sair no recibo.");
        if (!ok) toast.error("O navegador bloqueou a janela do recibo. Permita pop-ups para este site.");
    };

    const stats = [
        { label: "Em aberto", value: formatCurrency(openTotal), icon: Wallet, color: "text-sky-600 bg-sky-500/10" },
        { label: "Sessões em aberto", value: String(openCount), icon: Clock, color: "text-amber-600 bg-amber-500/10" },
        { label: "Total pago", value: formatCurrency(paidTotal), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
        {
            label: "Valor da sessão",
            value: data?.patient.valorSessao ? formatCurrency(data.patient.valorSessao) : "—",
            icon: Receipt,
            color: "text-violet-600 bg-violet-500/10",
        },
    ];

    const chargeColumns: DataTableColumn<Charge>[] = [
        { header: "Sessão", className: "w-[22%]", render: (c) => <span className="font-medium text-foreground">{DATE.format(c.sessionDate)}</span> },
        { header: "Valor", className: "w-[20%]", render: (c) => formatCurrency(c.amount) },
        { header: "Vencimento", className: "w-[20%]", render: (c) => DATE.format(c.dueDate) },
        { header: "Situação", className: "w-[26%]", render: (c) => <ChargeStatusBadge charge={c} /> },
        {
            header: "",
            className: "w-[12%] text-right",
            render: (c) =>
                c.status === "open" ? (
                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Abonar"
                            disabled={waiveMutation.isPending}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Abonar a sessão de ${DATE.format(c.sessionDate)}? Ela deixa de ser cobrada.`)) {
                                    waiveMutation.mutate({ chargeId: c.id });
                                }
                            }}
                        >
                            <Ban className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </Button>
                    </div>
                ) : null,
        },
    ];

    const paymentColumns: DataTableColumn<Payment>[] = [
        { header: "Data", className: "w-[25%]", render: (p) => <span className="font-medium text-foreground">{DATE.format(p.paidAt)}</span> },
        { header: "Valor", className: "w-[30%]", render: (p) => <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span> },
        { header: "Forma", className: "w-[25%]", render: (p) => paymentMethodLabel(p.method) },
        {
            header: "",
            className: "w-[20%] text-right",
            render: (p) => (
                <div className="flex justify-end items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Imprimir recibo"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReceipt(p);
                        }}
                    >
                        <Printer className="size-3.5 text-blue-600" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Desfazer pagamento"
                        disabled={undoMutation.isPending}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (
                                window.confirm(
                                    `Desfazer o pagamento de ${formatCurrency(p.amount)} de ${DATE.format(p.paidAt)}? As sessões voltam para em aberto e a receita sai do Financeiro.`
                                )
                            ) {
                                undoMutation.mutate({ paymentId: p.id });
                            }
                        }}
                    >
                        <Undo2 className="size-3.5" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <StatsCards items={stats} isLoading={isPending} />

            {data && data.patient.valorSessao === null && (
                <p className="rounded-lg border border-dashed bg-muted/10 p-3 text-sm text-muted-foreground">
                    Cadastre o valor da sessão no cadastro do paciente (aba Contrato) para as sessões concluídas virarem cobrança.
                </p>
            )}

            <h3 className="font-medium pt-2">Sessões cobradas</h3>

            <DataTable
                data={charges}
                isLoading={isPending}
                columns={chargeColumns}
                searchPlaceholder="Buscar..."
                searchFilter={(c, term) => DATE.format(c.sessionDate).includes(term)}
                emptyState={{
                    title: "Nenhuma cobrança",
                    description: "Quando uma sessão deste paciente for marcada como concluída, a cobrança aparece aqui.",
                    icon: Wallet,
                }}
            />

            <h3 className="font-medium pt-2">Pagamentos recebidos</h3>
            <DataTable
                data={payments}
                isLoading={isPending}
                columns={paymentColumns}
                searchPlaceholder="Buscar..."
                searchFilter={(p, term) => DATE.format(p.paidAt).includes(term)}
                emptyState={{
                    title: "Nenhum pagamento",
                    description: "Os pagamentos registrados deste paciente aparecem aqui, com recibo para imprimir.",
                    icon: Receipt,
                }}
            />

            <AppSheet open={isPaying} onOpenChange={onPayingChange} title="Registrar Pagamento">
                {isPaying && (
                    <RegisterPaymentForm
                        patientId={patientId}
                        onDone={() => onPayingChange(false)}
                        onCancel={() => onPayingChange(false)}
                    />
                )}
            </AppSheet>
        </div>
    );
}
