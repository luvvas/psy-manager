import { useState } from "react";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { logger } from "@/lib/logger";
import { buildFinancialCsv, financialCsvFileName, parseExportMonth } from "../csv-export";

function downloadCsv(content: string, fileName: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportButton() {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
    const [isExporting, setIsExporting] = useState(false);
    const utils = trpc.useUtils();
    const range = parseExportMonth(month);

    const handleExport = async () => {
        if (!range) return;
        setIsExporting(true);
        try {
            const transactions = await utils.financial.list.fetch(range);
            downloadCsv(buildFinancialCsv(transactions), financialCsvFileName(month));
            toast.success("Arquivo exportado com sucesso!");
            setOpen(false);
        } catch (err) {
            logger.error("Erro ao exportar transações", err);
            toast.error("Erro ao exportar. Tente novamente.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex">
                    <Download className="size-4" />
                    Exportar
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-3" align="end">
                <div className="space-y-1.5">
                    <Label htmlFor="financeiro-exportar-mes">Mês</Label>
                    <Input
                        id="financeiro-exportar-mes"
                        type="month"
                        value={month}
                        onChange={(event) => setMonth(event.target.value)}
                    />
                </div>
                <Button
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={!range || isExporting}
                    onClick={handleExport}
                >
                    {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    Baixar .csv
                </Button>
            </PopoverContent>
        </Popover>
    );
}
