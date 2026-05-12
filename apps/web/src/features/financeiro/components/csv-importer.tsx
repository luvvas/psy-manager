import { useState } from "react";
import { FileSpreadsheet, UploadCloud, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const REQUIRED_FIELDS = [
    { id: "date", label: "Data" },
    { id: "description", label: "Descrição" },
    { id: "category", label: "Categoria" },
    { id: "status", label: "Situação" },
    { id: "amount", label: "Valor" },
] as const;

export type FieldId = typeof REQUIRED_FIELDS[number]["id"];

interface CsvImporterProps {
    csvData: {
        headers: string[];
        rows: any[][];
    } | null;
    mappings: Record<string, FieldId | "skip">;
    onMappingChange: (columnIndex: string, value: FieldId | "skip") => void;
    onFileSelect: (file: File) => void;
}

export function CsvImporter({ csvData, mappings, onMappingChange, onFileSelect }: CsvImporterProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.name.toLowerCase().endsWith(".csv")) {
            onFileSelect(file);
        }
    };

    if (!csvData) {
        return (
            <div 
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 transition-all select-none text-center space-y-4 
                    ${isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "bg-muted/30 border-muted-foreground/25"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className={`p-4 rounded-full transition-colors ${isDragging ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
                    {isDragging ? <UploadCloud className="size-10 animate-bounce" /> : <FileSpreadsheet className="size-10" />}
                </div>
                <div>
                    <h3 className="font-semibold text-lg">{isDragging ? "Solte o arquivo aqui" : "Arraste o arquivo para esta área"}</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                        Solte seu arquivo .csv aqui para iniciar o mapeamento.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border bg-card overflow-hidden flex flex-col flex-1">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {csvData.headers.map((_, colIdx) => {
                                const currentVal = mappings[colIdx] || "skip";
                                const matchedField = REQUIRED_FIELDS.find(f => f.id === currentVal);
                                const labelDisplay = matchedField ? matchedField.label : "Ignorar Coluna";
                                const isMapped = currentVal !== "skip";
                                
                                return (
                                    <TableHead key={colIdx} className="min-w-[180px] align-middle h-11">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className={`flex items-center gap-1.5 outline-none hover:text-foreground transition-colors group font-medium text-xs ${isMapped ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                                                <span className="uppercase tracking-wider">{labelDisplay}</span>
                                                <ChevronDown className="size-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-48">
                                                <DropdownMenuItem 
                                                    onClick={() => onMappingChange(String(colIdx), "skip")}
                                                    className={!isMapped ? "bg-accent" : ""}
                                                >
                                                    Ignorar Coluna
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {REQUIRED_FIELDS.map((field) => {
                                                    const isUsedElsewhere = Object.entries(mappings).some(([k, v]) => k !== String(colIdx) && v === field.id);
                                                    const isCurrent = currentVal === field.id;
                                                    return (
                                                        <DropdownMenuItem
                                                            key={field.id}
                                                            disabled={isUsedElsewhere}
                                                            onClick={() => !isUsedElsewhere && onMappingChange(String(colIdx), field.id as FieldId)}
                                                            className={`${isCurrent ? "bg-primary/10 text-primary font-medium" : ""} ${isUsedElsewhere ? "opacity-50 cursor-not-allowed" : ""}`}
                                                        >
                                                            {field.label} {isUsedElsewhere && "(Em uso)"}
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {csvData.rows.slice(0, 10).map((row, rowIdx) => (
                            <TableRow key={rowIdx}>
                                {csvData.headers.map((_, colIdx) => (
                                    <TableCell key={colIdx} className="py-3 text-sm border-r last:border-r-0 max-w-[250px] truncate">
                                        {String(row[colIdx] ?? "")}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                        {csvData.rows.length > 10 && (
                            <TableRow>
                                <TableCell colSpan={csvData.headers.length} className="text-center py-4 text-muted-foreground text-sm bg-muted/10">
                                    Mostrando 10 de {csvData.rows.length} linhas...
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
