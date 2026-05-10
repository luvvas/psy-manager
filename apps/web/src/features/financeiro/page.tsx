import { useState } from "react";
import { DollarSign, Plus, FileDown, Trash2, Pencil, CheckCircle2, Clock } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCards } from "./components/stats-cards";
import { IncomeChart } from "./components/income-chart";
import { DateRangePicker } from "./components/date-range-picker";
import { TransactionForm } from "./components/transaction-form";
import { AppSheet } from "@/components/layout/app-sheet";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { startOfMonth, endOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";

export function FinanceiroPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<any | null>(null);

    // Queries and mutations
    const { data: txList, refetch } = trpc.financial.list.useQuery({
        startDate: dateRange?.from,
        endDate: dateRange?.to,
    });

    const createMutation = trpc.financial.create.useMutation({
        onSuccess: () => {
            toast.success("Transação registrada com sucesso!");
            refetch();
            closeSheet();
        },
        onError: (err) => toast.error(`Erro: ${err.message}`),
    });

    const updateMutation = trpc.financial.update.useMutation({
        onSuccess: () => {
            toast.success("Transação atualizada!");
            refetch();
            closeSheet();
        },
        onError: (err) => toast.error(`Erro: ${err.message}`),
    });

    const deleteMutation = trpc.financial.delete.useMutation({
        onSuccess: () => {
            toast.success("Removido com sucesso");
            refetch();
        },
    });

    const openSheet = (tx?: any) => {
        setSelectedTx(tx || null);
        setIsSheetOpen(true);
    };

    const closeSheet = () => {
        setIsSheetOpen(false);
        setSelectedTx(null);
    };

    const handleSave = async (data: any) => {
        if (selectedTx) {
            await updateMutation.mutateAsync({ id: selectedTx.id, ...data });
        } else {
            await createMutation.mutateAsync(data);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Deseja realmente remover esta transação?")) {
            await deleteMutation.mutateAsync({ id });
        }
    };

    const allTransactions = txList || [];
    const incomes = allTransactions.filter(t => t.type === "income");
    const expenses = allTransactions.filter(t => t.type === "expense");

    const formatValue = (val: string | number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));
    };

    const columns: DataTableColumn<any>[] = [
        {
            header: "Data",
            className: "w-[12%]",
            render: (row) => new Date(row.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
        },
        {
            header: "Descrição",
            className: "w-[30%]",
            render: (row) => (
                <div>
                    <div className="font-medium">{row.description}</div>
                    {row.patientNome && <div className="text-xs text-muted-foreground">Paciente: {row.patientNome}</div>}
                </div>
            ),
        },
        {
            header: "Categoria",
            className: "w-[12%]",
            render: (row) => row.category ? <Badge variant="secondary" className="font-normal">{row.category}</Badge> : "-",
        },
        {
            header: "Situação",
            className: "w-[18%]",
            render: (row) => {
                const isPaid = row.status === "paid";
                const isIncome = row.type === "income";
                const label = isPaid 
                    ? (isIncome ? "Recebido" : "Pago") 
                    : (isIncome ? "A Receber" : "A Pagar");
                
                return (
                    <Badge 
                        variant={isPaid ? "default" : "outline"} 
                        className={`gap-1.5 font-medium ${isPaid ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 shadow-none border-transparent" : "text-amber-700 border-amber-200 bg-amber-50"}`}
                    >
                        {isPaid ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {label}
                    </Badge>
                );
            }
        },
        {
            header: "Valor",
            className: "w-[18%]",
            render: (row) => (
                <span className={`font-semibold ${row.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                    {row.type === "income" ? "+" : "-"} {formatValue(row.amount)}
                </span>
            ),
        },
        {
            header: "",
            className: "w-[10%] text-right",
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openSheet(row)}>
                        <Pencil className="size-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDelete(row.id)}>
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <>
            <AppHeader
                title="Financeiro"
                description="Controle fluxo de caixa, gerencie pagamentos e acompanhe a saúde financeira."
                icon={DollarSign}
                actions={
                    <div className="flex items-center gap-2">
                        <DateRangePicker date={dateRange} setDate={setDateRange} />
                        <Button
                            onClick={() => openSheet()}
                            className="gap-1.5"
                        >
                            <Plus className="size-4" />
                            Nova Transação
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <StatsCards transactions={allTransactions} />

                <Tabs defaultValue="resumo" className="flex flex-col flex-1 space-y-4 mt-2">
                    <TabsList className="grid w-full max-w-md grid-cols-3">
                        <TabsTrigger value="resumo">Resumo</TabsTrigger>
                        <TabsTrigger value="receitas">Receitas</TabsTrigger>
                        <TabsTrigger value="despesas">Despesas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="resumo" className="space-y-4 outline-none">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                                <IncomeChart transactions={allTransactions} />
                            </div>
                            <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
                                <h3 className="font-semibold text-sm">Últimas movimentações</h3>
                                <div className="space-y-3 overflow-y-auto max-h-[280px]">
                                    {allTransactions.slice(0, 5).map(tx => (
                                        <div key={tx.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                                            <div>
                                                <p className="font-medium leading-none">{tx.description}</p>
                                                <span className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
                                            </div>
                                            <span className={tx.type === "income" ? "text-emerald-600" : "text-rose-600"}>
                                                {formatValue(tx.amount)}
                                            </span>
                                        </div>
                                    ))}
                                    {allTransactions.length === 0 && <p className="text-xs text-muted-foreground">Sem movimentações recentes.</p>}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="receitas" className="space-y-4 outline-none">
                        <DataTable
                            data={incomes}
                            columns={columns}
                            searchPlaceholder="Filtrar receitas..."
                            searchFilter={(row, term) => row.description.toLowerCase().includes(term.toLowerCase())}
                            emptyState={{
                                title: "Sem receitas registradas",
                                description: "Adicione receitas ou expanda o filtro de período.",
                                icon: DollarSign
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="despesas" className="space-y-4 outline-none">
                        <DataTable
                            data={expenses}
                            columns={columns}
                            searchPlaceholder="Filtrar despesas..."
                            searchFilter={(row, term) => row.description.toLowerCase().includes(term.toLowerCase())}
                            emptyState={{
                                title: "Nenhuma despesa",
                                description: "Parabéns, nenhuma despesa registrada no período.",
                                icon: FileDown
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <AppSheet
                open={isSheetOpen}
                onOpenChange={(open) => !open && closeSheet()}
                title={selectedTx ? "Editar Transação" : "Nova Transação"}
            >
                {isSheetOpen && (
                    <TransactionForm
                        initialData={selectedTx}
                        onSave={handleSave}
                        onCancel={closeSheet}
                    />
                )}
            </AppSheet>
        </>
    );
}
