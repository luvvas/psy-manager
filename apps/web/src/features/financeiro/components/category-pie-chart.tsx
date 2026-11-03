import { useMemo, useState } from "react";
import { PieChart, Pie } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/utils/format";
import { TransactionTypeSelect } from "./transaction-type-select";
import type { Transaction, TransactionTypeFilter } from "../types";

interface CategoryPieChartProps {
    transactions: Transaction[];
}

const PALETTES: Record<TransactionTypeFilter, string[]> = {
    all: [
        "var(--color-sky-500)",
        "var(--color-sky-400)",
        "var(--color-sky-300)",
        "var(--color-sky-600)",
        "var(--color-sky-700)",
        "var(--color-sky-200)",
        "var(--color-sky-900)",
    ],
    income: [
        "var(--color-emerald-500)",
        "var(--color-emerald-400)",
        "var(--color-emerald-300)",
        "var(--color-emerald-600)",
        "var(--color-emerald-700)",
        "var(--color-emerald-200)",
        "var(--color-emerald-900)",
    ],
    expense: [
        "var(--color-rose-500)",
        "var(--color-rose-400)",
        "var(--color-rose-300)",
        "var(--color-rose-600)",
        "var(--color-rose-700)",
        "var(--color-rose-200)",
        "var(--color-rose-900)",
    ],
};

const chartConfig = {
    amount: { label: "Valor" },
} satisfies ChartConfig;

export function CategoryPieChart({ transactions }: CategoryPieChartProps) {
    const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");

    const chartData = useMemo(() => {
        const summary: Record<string, number> = {};

        transactions.forEach((tx) => {
            if (typeFilter !== "all" && tx.type !== typeFilter) {
                return;
            }
            const category = tx.category || "Outros";
            summary[category] = (summary[category] || 0) + Number(tx.amount);
        });

        const activePalette = PALETTES[typeFilter];

        return Object.entries(summary)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount], index) => ({
                category,
                amount,
                fill: activePalette[index % activePalette.length],
            }));
    }, [transactions, typeFilter]);

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="grid gap-1">
                    <CardTitle className="text-sm font-medium">Distribuição</CardTitle>
                    <CardDescription className="text-xs">Por categoria</CardDescription>
                </div>
                <TransactionTypeSelect value={typeFilter} onChange={setTypeFilter} />
            </CardHeader>
            <CardContent className="flex-1 pb-4">
                {chartData.length === 0 ? (
                    <div className="flex h-[250px] w-full items-center justify-center text-xs text-muted-foreground">
                        Sem dados para exibir no gráfico
                    </div>
                ) : (
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square max-h-[250px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        formatter={(value, name) => (
                                            <>
                                                <span className="text-muted-foreground">{String(name)}:</span>
                                                <span className="font-mono font-medium text-foreground ml-auto">{formatCurrency(Number(value), { whole: true })}</span>
                                            </>
                                        )}
                                    />
                                }
                            />
                            <Pie
                                data={chartData}
                                dataKey="amount"
                                nameKey="category"
                                strokeWidth={2}
                            />
                        </PieChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
