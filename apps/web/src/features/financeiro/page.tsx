import { useState, useRef, useEffect } from "react";
import { DollarSign, Plus, UploadCloud, ArrowRight, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCards } from "./components/stats-cards";
import { IncomeChart } from "./components/income-chart";
import { CategoryPieChart } from "./components/category-pie-chart";
import { DateRangePicker } from "./components/date-range-picker";
import { TransactionForm } from "./components/transaction-form";
import { CsvImporter, REQUIRED_FIELDS, type FieldId } from "./components/csv-importer";
import { TransactionsTable } from "./components/transactions-table";
import { parseCurrency, parseDate, parseStatus } from "@/utils/csv";
import { AppSheet } from "@/components/layout/app-sheet";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { startOfMonth, endOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import Papa from "papaparse";

export function FinanceiroPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState("resumo");
    const [sidebarTypeFilter, setSidebarTypeFilter] = useState<"all" | "income" | "expense">("all");

    const [csvData, setCsvData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
    const [mappings, setMappings] = useState<Record<string, FieldId | "skip">>({});
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const createManyMutation = trpc.financial.createMany.useMutation({
        onSuccess: () => {
            toast.success("Transações importadas com sucesso!");
            handleImportComplete();
        },
        onError: (err) => {
            toast.error(`Erro na importação: ${err.message}`);
        },
        onSettled: () => {
            setIsImporting(false);
        }
    });

    useEffect(() => {
        if (csvData) {
            const initialMappings: Record<string, FieldId | "skip"> = {};
            csvData.headers.forEach((_, idx) => {
                initialMappings[idx] = "skip";
            });
            setMappings(initialMappings);
        } else {
            setMappings({});
        }
    }, [csvData]);

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

    const processFile = (file: File) => {
        Papa.parse(file, {
            complete: (results) => {
                const data = results.data as any[][];
                if (data.length > 0) {
                    const headers = data[0].map(h => String(h).trim());
                    const rows = data.slice(1).filter(row => row.length > 1 || row[0] !== "");
                    setCsvData({ headers, rows });
                    setActiveTab("importacao");
                    toast.success(`Arquivo "${file.name}" carregado!`);
                } else {
                    toast.error("Arquivo está vazio.");
                }
            },
            error: (error) => {
                toast.error(`Erro ao ler CSV: ${error.message}`);
            },
            skipEmptyLines: true,
        });
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        processFile(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleMappingChange = (columnIndex: string, value: FieldId | "skip") => {
        setMappings((prev) => ({ ...prev, [columnIndex]: value }));
    };

    const mappedFieldsValues = Object.values(mappings);
    const requiredFieldCount = REQUIRED_FIELDS.length;
    const mappedCount = REQUIRED_FIELDS.filter(f => mappedFieldsValues.includes(f.id)).length;
    const isMappingComplete = mappedCount === requiredFieldCount;

    const handleConfirmImport = async () => {
        if (!csvData || !isMappingComplete) return;

        setIsImporting(true);

        try {
            const reverseMap: Record<string, number> = {};
            Object.entries(mappings).forEach(([colIdx, fieldId]) => {
                if (fieldId !== "skip") {
                    reverseMap[fieldId] = parseInt(colIdx, 10);
                }
            });

            const payload = csvData.rows
                .filter(row => row.some(cell => cell !== null && cell !== ""))
                .map(row => {
                    const rawAmount = String(row[reverseMap["amount"]] || "");
                    const amount = parseCurrency(rawAmount);

                    return {
                        date: parseDate(String(row[reverseMap["date"]] || "")),
                        description: String(row[reverseMap["description"]] || "Sem descrição"),
                        category: String(row[reverseMap["category"]] || ""),
                        amount: Math.abs(amount),
                        type: (amount >= 0 ? "income" : "expense") as "income" | "expense",
                        status: parseStatus(String(row[reverseMap["status"]] || "paid")),
                    };
                });

            await createManyMutation.mutateAsync(payload);
        } catch (err) {
            console.error(err);
            setIsImporting(false);
        }
    };

    const handleImportComplete = () => {
        setCsvData(null);
        refetch();
        setActiveTab("resumo");
    };

    const allTransactions = txList || [];
    const incomes = allTransactions.filter(t => t.type === "income");
    const expenses = allTransactions.filter(t => t.type === "expense");

    const formatValue = (val: string | number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));
    };

    return (
        <>
            <AppHeader
                title="Financeiro"
                description="Controle fluxo de caixa, gerencie pagamentos e acompanhe a saúde financeira."
                icon={DollarSign}
                actions={
                    <div className="flex items-center gap-2">
                        <DateRangePicker date={dateRange} setDate={setDateRange} />

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileSelect}
                        />

                        <Button
                            variant="outline"
                            className="gap-1.5 hidden sm:flex"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UploadCloud className="size-4" />
                            Importar .csv
                        </Button>

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

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex flex-col flex-1 space-y-4 mt-2"
                >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <TabsList className="grid w-full max-w-xl grid-cols-4">
                            <TabsTrigger value="resumo">Resumo</TabsTrigger>
                            <TabsTrigger value="receitas">Receitas</TabsTrigger>
                            <TabsTrigger value="despesas">Despesas</TabsTrigger>
                            <TabsTrigger value="importacao" className="relative">
                                Importação
                                {csvData && (
                                    <span className="absolute top-1 right-1 size-2 bg-primary rounded-full animate-pulse" />
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === "importacao" && csvData && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCsvData(null)}
                                    disabled={isImporting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1.5 shadow-sm min-w-[120px]"
                                    disabled={!isMappingComplete || isImporting}
                                    onClick={handleConfirmImport}
                                >
                                    {isImporting ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <>Importar {mappedCount}/{requiredFieldCount}</>
                                    )}
                                    {!isImporting && <ArrowRight className="size-3.5" />}
                                </Button>
                            </div>
                        )}
                    </div>

                    <TabsContent value="resumo" className="space-y-4 outline-none">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                                <IncomeChart transactions={allTransactions} />
                            </div>
                            <div className="lg:col-span-1">
                                <CategoryPieChart transactions={allTransactions} />
                            </div>
                        </div>

                        <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
                            <div className="flex items-center justify-between pb-1 border-b">
                                <h3 className="font-semibold text-sm text-muted-foreground">Últimas Movimentações</h3>
                                <Select
                                    value={sidebarTypeFilter}
                                    onValueChange={(v: any) => setSidebarTypeFilter(v)}
                                >
                                    <SelectTrigger className="h-8 w-[130px] text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">Tudo</SelectItem>
                                        <SelectItem value="income" className="text-xs">Receitas</SelectItem>
                                        <SelectItem value="expense" className="text-xs">Despesas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                                {allTransactions
                                    .filter(t => sidebarTypeFilter === "all" || t.type === sidebarTypeFilter)
                                    .slice(0, 8)
                                    .map(tx => (
                                        <div key={tx.id} className="flex justify-between items-center text-sm border-b pb-3 last:border-0 hover:bg-accent/5 px-2 py-1.5 rounded-lg transition-colors">
                                            <div className="flex flex-col gap-0.5">
                                                <p className="font-medium leading-none text-foreground">{tx.description}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
                                                    {tx.category && <span>• {tx.category}</span>}
                                                </div>
                                            </div>
                                            <span className={`font-semibold tracking-tight ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                                                {tx.type === "income" ? "+" : "-"} {formatValue(tx.amount)}
                                            </span>
                                        </div>
                                    ))}
                                {allTransactions.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">Sem movimentações registradas.</p>}
                                {allTransactions.length > 0 && allTransactions.filter(t => sidebarTypeFilter === "all" || t.type === sidebarTypeFilter).length === 0 && (
                                    <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma movimentação com este filtro.</p>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="receitas" className="space-y-4 outline-none">
                        <TransactionsTable
                            data={incomes}
                            type="income"
                            onEdit={openSheet}
                            onDelete={handleDelete}
                        />
                    </TabsContent>

                    <TabsContent value="despesas" className="space-y-4 outline-none">
                        <TransactionsTable
                            data={expenses}
                            type="expense"
                            onEdit={openSheet}
                            onDelete={handleDelete}
                        />
                    </TabsContent>

                    <TabsContent value="importacao" className="flex-1 flex flex-col space-y-4 outline-none">
                        <CsvImporter
                            csvData={csvData}
                            mappings={mappings}
                            onMappingChange={handleMappingChange}
                            onFileSelect={processFile}
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
