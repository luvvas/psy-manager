import { useMemo, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface IncomeChartProps {
    transactions: any[];
}

export function IncomeChart({ transactions }: IncomeChartProps) {
    const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");

    const chartData = useMemo(() => {
        const daily: Record<string, { date: string; dateRaw: Date; income: number; expense: number }> = {};

        transactions.forEach((tx) => {
            const txDate = new Date(tx.date);
            const dateStr = txDate.toISOString().split("T")[0];
            if (!daily[dateStr]) {
                daily[dateStr] = {
                    date: txDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
                    dateRaw: txDate,
                    income: 0,
                    expense: 0,
                };
            }
            if (tx.type === "income") {
                daily[dateStr].income += Number(tx.amount);
            } else {
                daily[dateStr].expense += Number(tx.amount);
            }
        });

        return Object.values(daily).sort((a, b) => a.dateRaw.getTime() - b.dateRaw.getTime());
    }, [transactions]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <Card className="flex-1">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Movimentação Financeira</CardTitle>
                <Select
                    value={typeFilter}
                    onValueChange={(v: any) => setTypeFilter(v)}
                >
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">Tudo</SelectItem>
                        <SelectItem value="income" className="text-xs">Receitas</SelectItem>
                        <SelectItem value="expense" className="text-xs">Despesas</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="p-0 pb-4 pt-2 h-[300px]">
                {chartData.length === 0 ? (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        Sem dados para exibir no gráfico
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                fontSize={11}
                                className="fill-muted-foreground"
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                fontSize={11}
                                className="fill-muted-foreground"
                                tickFormatter={(val) => `R$${val}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--popover))",
                                    borderColor: "hsl(var(--border))",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    color: "hsl(var(--foreground))",
                                }}
                                itemStyle={{ padding: 0 }}
                                formatter={(value: any) => [formatCurrency(Number(value || 0))]}
                                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
                            />
                            {(typeFilter === "all" || typeFilter === "income") && (
                                <Area
                                    type="monotone"
                                    dataKey="income"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorIncome)"
                                    name="Receitas"
                                />
                            )}
                            {(typeFilter === "all" || typeFilter === "expense") && (
                                <Area
                                    type="monotone"
                                    dataKey="expense"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorExpense)"
                                    name="Despesas"
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
