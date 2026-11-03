import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/utils/format";
import { TransactionTypeSelect } from "./transaction-type-select";
import type { Transaction, TransactionTypeFilter } from "../types";

const INCOME_COLOR = "var(--color-emerald-500)";
const EXPENSE_COLOR = "var(--color-rose-500)";

const chartConfig = {
    income: { label: "Receitas", color: INCOME_COLOR },
    expense: { label: "Despesas", color: EXPENSE_COLOR },
} satisfies ChartConfig;

const COMPACT_BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
});

function seriesLabel(name: string | number | undefined) {
    const key = String(name);
    return key === "income" || key === "expense" ? chartConfig[key].label : key;
}

interface IncomeChartProps {
    transactions: Transaction[];
}

export function IncomeChart({ transactions }: IncomeChartProps) {
    const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");

    const chartData = useMemo(() => {
        const daily = new Map<string, { date: string; income: number; expense: number }>();

        for (const tx of transactions) {
            const key = tx.date.toISOString().slice(0, 10);
            let day = daily.get(key);
            if (!day) {
                day = {
                    date: tx.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
                    income: 0,
                    expense: 0,
                };
                daily.set(key, day);
            }
            day[tx.type === "income" ? "income" : "expense"] += Number(tx.amount);
        }

        return [...daily.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, day]) => day);
    }, [transactions]);

    return (
        <Card className="flex-1">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Movimentação Financeira</CardTitle>
                <TransactionTypeSelect value={typeFilter} onChange={setTypeFilter} />
            </CardHeader>
            <CardContent className="pb-4 pt-2 h-[300px]">
                {chartData.length === 0 ? (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        Sem dados para exibir no gráfico
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
                        <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="financeiro-income-fill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="financeiro-expense-fill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11} />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                fontSize={11}
                                width={72}
                                tickFormatter={(value: number) => COMPACT_BRL.format(value)}
                            />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        formatter={(value, name, item) => (
                                            <>
                                                <span
                                                    className="size-2.5 shrink-0 rounded-[2px]"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span className="text-muted-foreground">
                                                    {seriesLabel(name)}
                                                </span>
                                                <span className="font-mono font-medium text-foreground ml-auto tabular-nums">
                                                    {formatCurrency(Number(value), { whole: true })}
                                                </span>
                                            </>
                                        )}
                                    />
                                }
                            />
                            {typeFilter !== "expense" && (
                                <Area
                                    type="monotone"
                                    dataKey="income"
                                    stroke={INCOME_COLOR}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#financeiro-income-fill)"
                                />
                            )}
                            {typeFilter !== "income" && (
                                <Area
                                    type="monotone"
                                    dataKey="expense"
                                    stroke={EXPENSE_COLOR}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#financeiro-expense-fill)"
                                />
                            )}
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
