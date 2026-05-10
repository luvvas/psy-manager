import { TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react";
import { StatsCards as GenericStatsCards } from "@/components/stats-cards";

export interface FinancialTransaction {
    id: string;
    type: string;
    amount: string | number;
    description: string;
    date: Date;
}

interface StatsCardsProps {
    transactions: FinancialTransaction[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
};

export function StatsCards({ transactions }: StatsCardsProps) {
    const income = transactions
        .filter((t) => t.type === "income")
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const expenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

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

    return <GenericStatsCards items={stats} />;
}
