import { TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react";
import { StatsCards as GenericStatsCards } from "@/components/stats-cards";
import { formatCurrency } from "@/utils/format";
import type { Transaction } from "../types";

interface StatsCardsProps {
    isLoading?: boolean;
    transactions: Transaction[];
}

export function StatsCards({ transactions, isLoading }: StatsCardsProps) {
    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
        if (tx.type === "income") income += Number(tx.amount);
        else if (tx.type === "expense") expenses += Number(tx.amount);
    }

    const balance = income - expenses;

    const stats = [
        {
            label: "Receitas",
            value: formatCurrency(income),
            icon: TrendingUp,
            color: "text-emerald-600 bg-emerald-500/10",
        },
        {
            label: "Despesas",
            value: formatCurrency(expenses),
            icon: TrendingDown,
            color: "text-rose-600 bg-rose-500/10",
        },
        {
            label: "Balanço Total",
            value: formatCurrency(balance),
            icon: Wallet,
            color: balance >= 0 ? "text-sky-600 bg-sky-500/10" : "text-rose-600 bg-rose-500/10",
        },
        {
            label: "Transações",
            value: String(transactions.length),
            icon: Calendar,
            color: "text-violet-600 bg-violet-500/10",
        },
    ];

    return <GenericStatsCards items={stats} isLoading={isLoading} />;
}
