import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, FileText, HandCoins, MessageCircle, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatsCards } from "@/components/stats-cards";
import { AppSheet } from "@/components/layout/app-sheet";
import { RegisterPaymentForm } from "@/components/billing/register-payment-form";
import { useSendCharge } from "@/components/billing/use-send-charge";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { formatCurrency } from "@/utils/format";

export type Receivable = RouterOutputs["billing"]["receivables"][number];

const DUE_DATE = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

export function ReceivablesTab() {
    const navigate = useNavigate();
    const sendCharge = useSendCharge();
    const [payingPatientId, setPayingPatientId] = useState<string | null>(null);

    const { data: summary, isPending: isSummaryPending } = trpc.billing.summary.useQuery();
    const { data: receivables, isPending } = trpc.billing.receivables.useQuery();

    const stats = [
        {
            label: "A receber",
            value: formatCurrency(summary?.toReceive ?? 0),
            icon: Wallet,
            color: "text-sky-600 bg-sky-500/10",
        },
        {
            label: "Em atraso",
            value: formatCurrency(summary?.overdue ?? 0),
            icon: AlertTriangle,
            color: "text-rose-600 bg-rose-500/10",
        },
        {
            label: "Recebido no mês",
            value: formatCurrency(summary?.receivedThisMonth ?? 0),
            icon: CheckCircle2,
            color: "text-emerald-600 bg-emerald-500/10",
        },
        {
            label: "Pacientes com saldo",
            value: String(summary?.patientsWithBalance ?? 0),
            icon: Users,
            color: "text-violet-600 bg-violet-500/10",
        },
    ];

    const columns: DataTableColumn<Receivable>[] = [
        {
            header: "Paciente",
            className: "w-[30%]",
            render: (row) => (
                <div>
                    <div className="font-medium text-foreground">{row.nome ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                        {row.modeloCobranca === "mensal" ? "Cobrança mensal" : "Cobrança por sessão"}
                    </div>
                </div>
            ),
        },
        {
            header: "Sessões",
            className: "w-[12%]",
            render: (row) => `${row.openCount} em aberto`,
        },
        {
            header: "Valor",
            className: "w-[18%]",
            render: (row) => (
                <div>
                    <div className="font-semibold text-foreground">{formatCurrency(row.total)}</div>
                    {row.overdueTotal > 0 && (
                        <div className="text-xs text-rose-600">{formatCurrency(row.overdueTotal)} vencido</div>
                    )}
                </div>
            ),
        },
        {
            header: "Vencimento",
            className: "w-[22%]",
            render: (row) => {
                const overdue = row.overdueTotal > 0;
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{DUE_DATE.format(row.oldestDueDate)}</span>
                        <Badge
                            variant="outline"
                            className={`gap-1 font-medium ${overdue ? "text-rose-700 border-rose-200 bg-rose-50" : "text-amber-700 border-amber-200 bg-amber-50"}`}
                        >
                            <Clock className="size-3" />
                            {overdue ? "Vencido" : "Em dia"}
                        </Badge>
                    </div>
                );
            },
        },
        {
            header: "",
            className: "w-[18%] text-right",
            render: (row) => (
                <div className="flex justify-end items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Registrar pagamento"
                        onClick={(e) => {
                            e.stopPropagation();
                            setPayingPatientId(row.patientId);
                        }}
                    >
                        <HandCoins className="size-3.5 text-emerald-600" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Cobrar no WhatsApp"
                        onClick={(e) => {
                            e.stopPropagation();
                            sendCharge({
                                patientName: row.nome ?? "",
                                telefone: row.telefone,
                                openCount: row.openCount,
                                total: row.total,
                            });
                        }}
                    >
                        <MessageCircle className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Ver extrato"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pacientes/${row.patientId}?aba=financeiro`);
                        }}
                    >
                        <FileText className="size-3.5 text-blue-600" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <StatsCards items={stats} isLoading={isSummaryPending} />

            <DataTable
                data={receivables ?? []}
                isLoading={isPending}
                columns={columns}
                searchPlaceholder="Buscar paciente..."
                searchFilter={(row, term) => (row.nome ?? "").toLowerCase().includes(term.toLowerCase())}
                emptyState={{
                    title: "Nada a receber",
                    description: "Sessões concluídas de pacientes com valor de sessão cadastrado aparecem aqui.",
                    icon: HandCoins,
                }}
            />

            <AppSheet
                open={payingPatientId !== null}
                onOpenChange={(open) => !open && setPayingPatientId(null)}
                title="Registrar Pagamento"
            >
                {payingPatientId && (
                    <RegisterPaymentForm
                        patientId={payingPatientId}
                        onDone={() => setPayingPatientId(null)}
                        onCancel={() => setPayingPatientId(null)}
                    />
                )}
            </AppSheet>
        </div>
    );
}
