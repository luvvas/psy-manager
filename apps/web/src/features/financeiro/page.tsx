import { useState, useRef } from "react";
import { DollarSign, Plus, UploadCloud, ArrowRight, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCards } from "./components/stats-cards";
import { IncomeChart } from "./components/income-chart";
import { CategoryPieChart } from "./components/category-pie-chart";
import { RecentTransactions } from "./components/recent-transactions";
import { DateRangePicker } from "./components/date-range-picker";
import { TransactionForm } from "./components/transaction-form";
import { TransactionsTable } from "./components/transactions-table";
import { mapCsvRowsToTransactions, TRANSACTION_CSV_FIELDS } from "./csv-import";
import { CsvColumnMapper } from "@/components/csv-import/csv-column-mapper";
import { useCsvImport } from "@/components/csv-import/use-csv-import";
import { AppSheet } from "@/components/layout/app-sheet";
import { trpc } from "@/lib/trpc";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { startOfMonth, endOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import { getErrorMessage } from "@/utils/format";
import type { Transaction, TransactionInput } from "./types";

export function FinanceiroPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    }));
    const [queryRange, setQueryRange] = useState(() => ({
        startDate: startOfMonth(new Date()) as Date | undefined,
        endDate: endOfMonth(new Date()) as Date | undefined,
    }));
    const handleDateRangeChange = (range: DateRange | undefined) => {
        setDateRange(range);
        if (!range) setQueryRange({ startDate: undefined, endDate: undefined });
        else if (range.from && range.to) setQueryRange({ startDate: range.from, endDate: range.to });
    };
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [activeTab, setActiveTab] = useState("resumo");

    const csv = useCsvImport(TRANSACTION_CSV_FIELDS);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const utils = trpc.useUtils();
    const { data: txList, isPending: isLoadingTransactions } = trpc.financial.list.useQuery(queryRange, {
        placeholderData: (previous) => previous,
    });

    const createMutation = trpc.financial.create.useMutation({
        onSuccess: () => {
            toast.success("Transação cadastrada com sucesso!");
            utils.financial.invalidate();
            closeSheet();
        },
        onError: (err) => toast.error(`Erro ao cadastrar: ${err.message}`),
    });

    const updateMutation = trpc.financial.update.useMutation({
        onSuccess: () => {
            toast.success("Transação atualizada com sucesso!");
            utils.financial.invalidate();
            closeSheet();
        },
        onError: (err) => toast.error(`Erro ao atualizar: ${err.message}`),
    });

    const deleteMutation = trpc.financial.delete.useMutation({
        onSuccess: () => {
            toast.success("Transação excluída com sucesso!");
            utils.financial.invalidate();
        },
        onError: (err) => toast.error(`Erro ao excluir: ${err.message}`),
    });

    const createManyMutation = trpc.financial.createMany.useMutation({
        onSuccess: () => {
            toast.success("Transações importadas com sucesso!");
            handleImportComplete();
        },
        onError: (err) => {
            toast.error(`Erro ao importar: ${err.message}`);
        },
    });
    const isImporting = createManyMutation.isPending;

    const openSheet = (tx?: Transaction) => {
        setSelectedTx(tx || null);
        setIsSheetOpen(true);
    };

    const closeSheet = () => {
        setIsSheetOpen(false);
        setSelectedTx(null);
    };

    const handleSave = async (data: TransactionInput) => {
        if (selectedTx) {
            await updateMutation.mutateAsync({ id: selectedTx.id, ...data });
        } else {
            await createMutation.mutateAsync(data);
        }
    };

    const handleDelete = (id: string, description: string) => {
        if (window.confirm(`Deseja realmente excluir "${description}"?`)) {
            deleteMutation.mutate({ id });
        }
    };

    const handleLoadFile = async (file: File) => {
        if (await csv.loadFile(file)) setActiveTab("importacao");
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        void handleLoadFile(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleConfirmImport = () => {
        if (!csv.csvData || !csv.isMappingComplete) return;
        let payload;
        try {
            payload = mapCsvRowsToTransactions(csv.csvData.rows, csv.mappings);
        } catch (err) {
            logger.error("Erro ao importar transações", err);
            toast.error(`Erro ao importar: ${getErrorMessage(err, "verifique o arquivo.")}`);
            return;
        }
        createManyMutation.mutate(payload);
    };

    const handleImportComplete = () => {
        csv.reset();
        utils.financial.invalidate();
        setActiveTab("resumo");
    };

    const allTransactions = txList ?? [];
    const incomes: Transaction[] = [];
    const expenses: Transaction[] = [];
    for (const tx of allTransactions) {
        if (tx.type === "income") incomes.push(tx);
        else if (tx.type === "expense") expenses.push(tx);
    }
    const defaultType = activeTab === "despesas" ? "expense" : "income";

    return (
        <>
            <AppHeader
                title="Financeiro"
                description="Controle fluxo de caixa, gerencie pagamentos e acompanhe a saúde financeira."
                icon={DollarSign}
                actions={
                    <div className="flex items-center gap-2">
                        <DateRangePicker date={dateRange} setDate={handleDateRangeChange} />

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileSelect}
                        />

                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 hidden sm:flex"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UploadCloud className="size-4" />
                            Importar .csv
                        </Button>

                        <Button
                            size="sm"
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
                <StatsCards transactions={allTransactions} isLoading={isLoadingTransactions} />

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
                                {csv.csvData && (
                                    <span className="absolute top-1 right-1 size-2 bg-primary rounded-full animate-pulse" />
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === "importacao" && csv.csvData && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={csv.reset}
                                    disabled={isImporting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1.5 shadow-sm min-w-[120px]"
                                    disabled={!csv.isMappingComplete || isImporting}
                                    onClick={handleConfirmImport}
                                >
                                    {isImporting ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <>Importar {csv.mappedRequiredCount}/{csv.requiredCount}</>
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

                        <RecentTransactions transactions={allTransactions} />
                    </TabsContent>

                    <TabsContent value="receitas" className="space-y-4 outline-none">
                        <TransactionsTable
                            isLoading={isLoadingTransactions}
                            data={incomes}
                            type="income"
                            onEdit={openSheet}
                            onDelete={handleDelete}
                        />
                    </TabsContent>

                    <TabsContent value="despesas" className="space-y-4 outline-none">
                        <TransactionsTable
                            isLoading={isLoadingTransactions}
                            data={expenses}
                            type="expense"
                            onEdit={openSheet}
                            onDelete={handleDelete}
                        />
                    </TabsContent>

                    <TabsContent value="importacao" className="flex-1 flex flex-col space-y-4 outline-none">
                        <CsvColumnMapper
                            fields={TRANSACTION_CSV_FIELDS}
                            csvData={csv.csvData}
                            mappings={csv.mappings}
                            onMappingChange={csv.setMapping}
                            onFileSelect={handleLoadFile}
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
                        defaultType={defaultType}
                        onSave={handleSave}
                        onCancel={closeSheet}
                    />
                )}
            </AppSheet>
        </>
    );
}
