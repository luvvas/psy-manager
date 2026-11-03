import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { TransactionTypeSelect } from "./transaction-type-select";
import type { Transaction, TransactionTypeFilter } from "../types";

const RECENT_LIMIT = 8;

interface RecentTransactionsProps {
    transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
    const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");

    const filtered = typeFilter === "all"
        ? transactions
        : transactions.filter((tx) => tx.type === typeFilter);

    return (
        <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between border-b">
                <CardTitle className="font-semibold text-muted-foreground">Últimas Movimentações</CardTitle>
                <TransactionTypeSelect value={typeFilter} onChange={setTypeFilter} />
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto max-h-[350px]">
                {filtered.slice(0, RECENT_LIMIT).map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center text-sm border-b pb-3 last:border-0 hover:bg-accent/5 px-2 py-1.5 rounded-lg transition-colors">
                        <div className="flex flex-col gap-0.5">
                            <p className="font-medium leading-none text-foreground">{tx.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{tx.date.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
                                {tx.category && <span>• {tx.category}</span>}
                            </div>
                        </div>
                        <span className={`font-semibold tracking-tight ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                            {tx.type === "income" ? "+" : "-"} {formatCurrency(tx.amount)}
                        </span>
                    </div>
                ))}
                {transactions.length === 0 && (
                    <p className="text-xs text-muted-foreground p-4 text-center">Sem movimentações registradas.</p>
                )}
                {transactions.length > 0 && filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma movimentação com este filtro.</p>
                )}
            </CardContent>
        </Card>
    );
}
