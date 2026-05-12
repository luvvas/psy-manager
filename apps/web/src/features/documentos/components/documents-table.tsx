import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, FileCheck, ClipboardCopy, Eye, Settings2, Download, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DBDocument {
    id: string;
    title: string;
    category: string;
    patientId: string | null;
    updatedAt: Date;
    content: string | null;
    status: string;
    dateOfService: Date;
}

interface DocumentsTableProps {
    documents: DBDocument[];
    patients: { id: string; nome: string }[];
    onViewDocument: (doc: DBDocument) => void;
    onEditMetadata: (doc: DBDocument) => void;
    onDelete: (id: string, title: string) => void;
    onFinalize: (id: string, title: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    evolucao: "Evolução",
    contrato: "Contrato",
    atestado: "Atestado",
    laudo: "Laudo/Parecer",
    outro: "Outro",
};

const CATEGORY_ICONS: Record<string, any> = {
    evolucao: ClipboardCopy,
    contrato: FileCheck,
    atestado: FileText,
};

export function DocumentsTable({ documents, patients, onViewDocument, onEditMetadata, onDelete, onFinalize }: DocumentsTableProps) {

    const getPatientName = (id: string | null) => {
        if (!id) return "-";
        const p = patients.find(pat => pat.id === id);
        return p ? p.nome : "Carregando...";
    };

    const handleDownload = (doc: DBDocument) => {
        if (!doc.content) return;
        const link = document.createElement("a");
        link.href = doc.content;
        link.download = `${doc.title}.pdf`;
        link.click();
    };

    if (documents.length === 0) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-10 w-10 opacity-50" />
                    <p className="text-sm font-medium">Nenhum prontuário encontrado.</p>
                    <p className="text-xs">Faça upload ou crie seu primeiro registro.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-card shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Data de Serviço</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => {
                        const Icon = CATEGORY_ICONS[doc.category] || FileText;
                        const isFinalized = doc.status === "finalized";

                        return (
                            <TableRow key={doc.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded bg-primary/10 p-1.5 text-primary">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span>{doc.title}</span>
                                            {isFinalized ? (
                                                <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 leading-none h-4 mt-0.5 border-green-500 text-green-600">
                                                    Finalizado
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="w-fit text-[10px] px-1 py-0 leading-none h-4 mt-0.5">
                                                    Rascunho
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="capitalize">{CATEGORY_LABELS[doc.category] || doc.category}</span>
                                </TableCell>
                                <TableCell>{getPatientName(doc.patientId)}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {format(new Date(doc.dateOfService), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => onViewDocument(doc)}
                                            className="h-8 gap-1.5 mr-1"
                                            title="Visualizar Documento"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Visualizar
                                        </Button>
                                        
                                        {!isFinalized && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => onFinalize(doc.id, doc.title)}
                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                title="Assinar/Finalizar Prontuário"
                                            >
                                                <Lock className="h-4 w-4" />
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDownload(doc)}
                                            className="h-8 w-8"
                                            disabled={!doc.content}
                                            title="Baixar Arquivo"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>

                                        {!isFinalized && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onEditMetadata(doc)}
                                                    className="h-8 w-8"
                                                    title="Editar Detalhes"
                                                >
                                                    <Settings2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onDelete(doc.id, doc.title)}
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    title="Deletar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
