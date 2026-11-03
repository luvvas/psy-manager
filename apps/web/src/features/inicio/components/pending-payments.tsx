import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { HomePanel, MoreItems } from "./home-panel";
import { formatCurrency } from "@/utils/format";

export interface HomePendingPayment {
    id: string;
    type: "income" | "expense";
    description: string;
    patientNome: string | null;
    amount: number;
    date: Date;
    isOverdue: boolean;
}

interface PendingPaymentsProps {
    isLoading?: boolean;
    payments: HomePendingPayment[];
    hiddenCount: number;
    totalToReceive: number;
}

export function PendingPayments({ payments, hiddenCount, totalToReceive, isLoading }: PendingPaymentsProps) {
    return (
        <HomePanel
            isLoading={isLoading}
            title="Pagamentos pendentes"
            description={`${formatCurrency(totalToReceive)} a receber no total.`}
            action={{ label: "Ver todos", to: "/financeiro" }}
            isEmpty={payments.length === 0}
            empty={{
                icon: Wallet,
                title: "Nenhum pagamento pendente",
                description: "Transações marcadas como pendentes no Financeiro aparecem aqui.",
            }}
        >
            <ul className="flex-1 divide-y">
                {payments.map((p) => {
                    const isIncome = p.type === "income";
                    const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
                    return (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                            <div
                                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                                    isIncome ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                }`}
                            >
                                <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                    {p.patientNome || p.description}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {isIncome ? "A receber" : "A pagar"}
                                    {p.patientNome ? ` · ${p.description}` : ""}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-xs font-semibold tabular-nums text-foreground">{formatCurrency(p.amount)}</p>
                                <p className={`text-xs ${p.isOverdue ? "font-medium text-rose-600" : "text-muted-foreground"}`}>
                                    {p.isOverdue ? "Venceu " : ""}
                                    {format(p.date, "dd/MM", { locale: ptBR })}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <MoreItems count={hiddenCount} to="/financeiro" />
        </HomePanel>
    );
}
