import { useMemo, useState } from "react";
import {
    PieChart,
    Pie
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

interface CategoryPieChartProps {
    transactions: any[];
}

const PALETTES = {
    all: ["#3b82f6", "#60a5fa", "#93c5fd", "#2563eb", "#1d4ed8", "#bfdbfe", "#1e40af"], // Blue
    income: ["#10b981", "#34d399", "#6ee7b7", "#059669", "#047857", "#a7f3d0", "#064e3b"], // Green
    expense: ["#ef4444", "#f87171", "#fca5a5", "#dc2626", "#b91c1c", "#fecaca", "#7f1d1d"], // Red
};

export function CategoryPieChart({ transactions }: CategoryPieChartProps) {
    const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");

    const { chartData, chartConfig } = useMemo(() => {
        const summary: Record<string, number> = {};

        transactions.forEach((tx) => {
            if (typeFilter !== "all" && tx.type !== typeFilter) {
                return;
            }
            const category = tx.category || "Outros";
            summary[category] = (summary[category] || 0) + Number(tx.amount);
        });

        const activePalette = PALETTES[typeFilter];

        const data = Object.entries(summary)
            .map(([name, value], index) => ({
                category: name,
                amount: value,
                fill: activePalette[index % activePalette.length],
            }))
            .sort((a, b) => b.amount - a.amount);

        const config = {
            amount: {
                label: "Valor",
            }
        } as const;

        return { chartData: data, chartConfig: config };
    }, [transactions, typeFilter]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="grid gap-1">
                    <CardTitle className="text-sm font-medium">Distribuição</CardTitle>
                    <CardDescription className="text-xs">Por categoria</CardDescription>
                </div>
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
                                        formatter={(value: any, name: any) => (
                                            <>
                                                <span className="text-muted-foreground">{String(name)}:</span>
                                                <span className="font-mono font-medium text-foreground ml-auto">{formatCurrency(Number(value))}</span>
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
