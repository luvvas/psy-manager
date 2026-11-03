import { useState } from "react";
import { ChevronDown, FileSpreadsheet, UploadCloud } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CsvData, CsvField, CsvMappings } from "./types";

const PREVIEW_ROWS = 10;

interface CsvColumnMapperProps<Id extends string> {
    fields: readonly CsvField<Id>[];
    csvData: CsvData | null;
    mappings: CsvMappings<Id>;
    onMappingChange: (columnIndex: string, value: Id | "skip") => void;
    onFileSelect: (file: File) => void;
}

/**
 * Área de soltar o .csv e, depois de lido, a prévia com um seletor de campo em cada
 * coluna. Usado pelos imports de pacientes e de transações.
 */
export function CsvColumnMapper<Id extends string>({
    fields,
    csvData,
    mappings,
    onMappingChange,
    onFileSelect,
}: CsvColumnMapperProps<Id>) {
    const [isDragging, setIsDragging] = useState(false);

    if (!csvData) {
        return (
            <div
                className={cn(
                    "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 transition-all select-none text-center space-y-4",
                    isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "bg-muted/30 border-muted-foreground/25"
                )}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.name.toLowerCase().endsWith(".csv")) onFileSelect(file);
                }}
            >
                <div className={cn("p-4 rounded-full transition-colors text-primary", isDragging ? "bg-primary/20" : "bg-primary/10")}>
                    {isDragging ? <UploadCloud className="size-10 animate-bounce" /> : <FileSpreadsheet className="size-10" />}
                </div>
                <div>
                    <h3 className="font-semibold text-lg">
                        {isDragging ? "Solte o arquivo aqui" : "Arraste o arquivo para esta área"}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                        Solte seu arquivo .csv aqui para iniciar o mapeamento.
                    </p>
                </div>
            </div>
        );
    }

    const required = fields.filter((f) => f.required);
    const optional = fields.filter((f) => !f.required);
    const grouped = required.length > 0 && optional.length > 0;
    // Campo → coluna que já o usa, calculado uma vez (antes: um .some() por campo por coluna).
    const columnByField = new Map<Id, string>();
    for (const [column, fieldId] of Object.entries(mappings)) {
        if (fieldId !== "skip") columnByField.set(fieldId, column);
    }

    return (
        <div className="rounded-lg border bg-card overflow-hidden flex flex-col flex-1 min-w-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {csvData.headers.map((_, colIdx) => {
                                const column = String(colIdx);
                                const current = mappings[column] ?? "skip";
                                const currentField = fields.find((f) => f.id === current);
                                const renderItem = (field: CsvField<Id>) => {
                                    const usedBy = columnByField.get(field.id);
                                    const inUse = usedBy !== undefined && usedBy !== column;
                                    return (
                                        <DropdownMenuItem
                                            key={field.id}
                                            disabled={inUse}
                                            onClick={() => onMappingChange(column, field.id)}
                                            className={cn(
                                                current === field.id &&
                                                    (field.required
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "bg-sky-500/10 text-sky-600 font-medium"),
                                                inUse && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {field.label} {inUse && "(Em uso)"}
                                        </DropdownMenuItem>
                                    );
                                };

                                return (
                                    <TableHead key={colIdx} className="min-w-45 align-middle h-11">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                className={cn(
                                                    "flex items-center gap-1.5 outline-none hover:text-foreground transition-colors group font-medium text-xs",
                                                    !currentField && "text-muted-foreground",
                                                    currentField?.required && "text-primary font-semibold",
                                                    currentField && !currentField.required && "text-sky-600 font-semibold"
                                                )}
                                            >
                                                <span className="uppercase tracking-wider">{currentField?.label ?? "Ignorar Coluna"}</span>
                                                <ChevronDown className="size-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
                                                <DropdownMenuItem
                                                    onClick={() => onMappingChange(column, "skip")}
                                                    className={!currentField ? "bg-accent" : ""}
                                                >
                                                    Ignorar Coluna
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {grouped ? (
                                                    <>
                                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
                                                            Obrigatórios
                                                        </DropdownMenuLabel>
                                                        {required.map(renderItem)}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
                                                            Opcionais
                                                        </DropdownMenuLabel>
                                                        {optional.map(renderItem)}
                                                    </>
                                                ) : (
                                                    fields.map(renderItem)
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {csvData.rows.slice(0, PREVIEW_ROWS).map((row, rowIdx) => (
                            <TableRow key={rowIdx}>
                                {csvData.headers.map((_, colIdx) => (
                                    <TableCell key={colIdx} className="py-3 text-sm border-r last:border-r-0 max-w-62.5 truncate">
                                        {row[colIdx] ?? ""}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                        {csvData.rows.length > PREVIEW_ROWS && (
                            <TableRow>
                                <TableCell
                                    colSpan={csvData.headers.length}
                                    className="text-center py-4 text-muted-foreground text-sm bg-muted/10"
                                >
                                    Mostrando {PREVIEW_ROWS} de {csvData.rows.length} linhas...
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
