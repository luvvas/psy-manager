import { useState } from "react";
import { FileSpreadsheet, UploadCloud, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const PATIENT_REQUIRED_FIELDS = [
    { id: "nome", label: "Nome" },
    { id: "email", label: "E-mail" },
    { id: "telefone", label: "Telefone" },
    { id: "dataNascimento", label: "Data de Nascimento" },
    { id: "cpf", label: "CPF" },
    { id: "cidade", label: "Cidade" },
] as const;

export const PATIENT_OPTIONAL_FIELDS = [
    { id: "valorSessao", label: "Valor da Sessão" },
    { id: "modeloCobranca", label: "Modelo de Cobrança" },
    { id: "nomeSocial", label: "Nome Social" },
    { id: "rg", label: "RG" },
    { id: "profissao", label: "Profissão" },
    { id: "endereco", label: "Endereço" },
    { id: "cep", label: "CEP" },
    { id: "uf", label: "UF" },
    { id: "contatoEmergencia", label: "Contato de Emergência" },
    { id: "respLegalNome", label: "Resp. Legal - Nome" },
    { id: "respLegalParentesco", label: "Resp. Legal - Parentesco" },
    { id: "respLegalCpf", label: "Resp. Legal - CPF" },
    { id: "respLegalTelefone", label: "Resp. Legal - Telefone" },
    { id: "respLegalEmail", label: "Resp. Legal - E-mail" },
    { id: "servicoContratadoTipo", label: "Serviço Contratado" },
    { id: "dataInicioAcompanhamento", label: "Início do Acompanhamento" },
    { id: "formaPagamento", label: "Forma de Pagamento" },
    { id: "formaPagamentoDetalhe", label: "Detalhe Pagamento" },
    { id: "responsavelFinanceiroTipo", label: "Resp. Financeiro - Tipo" },
    { id: "responsavelFinanceiroDetalhe", label: "Resp. Financeiro - Detalhe" },
    { id: "origemContato", label: "Origem do Contato" },
    { id: "origemContatoDetalhe", label: "Detalhe Origem" },
] as const;

export const ALL_PATIENT_FIELDS = [...PATIENT_REQUIRED_FIELDS, ...PATIENT_OPTIONAL_FIELDS] as const;
export type PatientFieldId = typeof ALL_PATIENT_FIELDS[number]["id"];

interface PatientCsvImporterProps {
    csvData: {
        headers: string[];
        rows: any[][];
    } | null;
    mappings: Record<string, PatientFieldId | "skip">;
    onMappingChange: (columnIndex: string, value: PatientFieldId | "skip") => void;
    onFileSelect: (file: File) => void;
}

export function PatientCsvImporter({ csvData, mappings, onMappingChange, onFileSelect }: PatientCsvImporterProps) {
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
        <div className="rounded-lg border bg-card overflow-hidden flex flex-col flex-1 min-w-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {csvData.headers.map((_, colIdx) => {
                                const currentVal = mappings[colIdx] || "skip";
                                const matchedField = ALL_PATIENT_FIELDS.find(f => f.id === currentVal);
                                const labelDisplay = matchedField ? matchedField.label : "Ignorar Coluna";
                                const isMapped = currentVal !== "skip";
                                const isRequired = PATIENT_REQUIRED_FIELDS.some(f => f.id === currentVal);

                                return (
                                    <TableHead key={colIdx} className="min-w-45 align-middle h-11">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className={`flex items-center gap-1.5 outline-none hover:text-foreground transition-colors group font-medium text-xs ${isRequired ? "text-primary font-semibold" : isMapped ? "text-blue-500 font-semibold" : "text-muted-foreground"}`}>
                                                <span className="uppercase tracking-wider">{labelDisplay}</span>
                                                <ChevronDown className="size-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
                                                <DropdownMenuItem
                                                    onClick={() => onMappingChange(String(colIdx), "skip")}
                                                    className={!isMapped ? "bg-accent" : ""}
                                                >
                                                    Ignorar Coluna
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Obrigatórios</DropdownMenuLabel>
                                                {PATIENT_REQUIRED_FIELDS.map((field) => {
                                                    const isUsedElsewhere = Object.entries(mappings).some(([k, v]) => k !== String(colIdx) && v === field.id);
                                                    const isCurrent = currentVal === field.id;
                                                    return (
                                                        <DropdownMenuItem
                                                            key={field.id}
                                                            disabled={isUsedElsewhere}
                                                            onClick={() => !isUsedElsewhere && onMappingChange(String(colIdx), field.id as PatientFieldId)}
                                                            className={`${isCurrent ? "bg-primary/10 text-primary font-medium" : ""} ${isUsedElsewhere ? "opacity-50 cursor-not-allowed" : ""}`}
                                                        >
                                                            {field.label} {isUsedElsewhere && "(Em uso)"}
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Opcionais</DropdownMenuLabel>
                                                {PATIENT_OPTIONAL_FIELDS.map((field) => {
                                                    const isUsedElsewhere = Object.entries(mappings).some(([k, v]) => k !== String(colIdx) && v === field.id);
                                                    const isCurrent = currentVal === field.id;
                                                    return (
                                                        <DropdownMenuItem
                                                            key={field.id}
                                                            disabled={isUsedElsewhere}
                                                            onClick={() => !isUsedElsewhere && onMappingChange(String(colIdx), field.id as PatientFieldId)}
                                                            className={`${isCurrent ? "bg-blue-500/10 text-blue-600 font-medium" : ""} ${isUsedElsewhere ? "opacity-50 cursor-not-allowed" : ""}`}
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
                                    <TableCell key={colIdx} className="py-3 text-sm border-r last:border-r-0 max-w-62.5 truncate">
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
