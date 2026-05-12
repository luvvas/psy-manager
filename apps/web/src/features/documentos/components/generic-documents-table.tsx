import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Eye, Settings2, Download, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DBGenericDocument {
    id: string;
    title: string;
    type: string;
    isTemplate: boolean;
    updatedAt: Date;
    content: string | null;
}

interface GenericDocumentsTableProps {
    documents: DBGenericDocument[];
    onViewDocument: (doc: DBGenericDocument) => void;
    onEditMetadata: (doc: DBGenericDocument) => void;
    onDelete: (id: string, title: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
    template: "Modelo",
    contrato: "Contrato Padrão",
    materiais: "Materiais",
    formulario: "Formulário",
    outro: "Outro",
};

export function GenericDocumentsTable({ documents, onViewDocument, onEditMetadata, onDelete }: GenericDocumentsTableProps) {

    const handleDownload = (doc: DBGenericDocument) => {
        if (!doc.content) return;
        const link = document.createElement("a");
        link.href = doc.content;
        link.download = `${doc.title}.pdf`;
        link.click();
    };

    if (documents.length === 0) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed bg-muted/5">
                <div className="flex flex-col items-center gap-2 text-muted-foreground text-center p-6">
                    <FileText className="h-12 w-12 opacity-20 mb-2" />
                    <p className="text-lg font-medium">Nenhum documento armazenado.</p>
                    <p className="text-sm max-w-xs">Sua biblioteca de modelos e papéis administrativos está vazia. Comece enviando um novo arquivo!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        <TableHead className="text-right pr-6">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => {
                        return (
                            <TableRow key={doc.id} className="group">
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3 py-1">
                                        <div className="rounded-lg bg-secondary p-2 text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-foreground">{doc.title}</span>
                                            {doc.isTemplate && (
                                                <Badge variant="outline" className="w-fit text-[9px] uppercase tracking-wider font-bold px-1.5 py-0 h-4 mt-1 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 gap-1">
                                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                                    Modelo
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="font-medium capitalize bg-muted/50">
                                        {TYPE_LABELS[doc.type] || doc.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {format(new Date(doc.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onViewDocument(doc)}
                                            className="h-8 px-3 text-xs gap-1.5 shadow-sm"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            Ver
                                        </Button>
                                        
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDownload(doc)}
                                            className="h-8 w-8 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                                            disabled={!doc.content}
                                            title="Baixar PDF"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>

                                        <div className="h-4 w-px bg-border mx-1" />

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEditMetadata(doc)}
                                            className="h-8 w-8 rounded-full opacity-60 hover:opacity-100 transition-opacity hover:bg-muted"
                                            title="Renomear / Alterar"
                                        >
                                            <Settings2 className="h-4 w-4" />
                                        </Button>
                                        
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(doc.id, doc.title)}
                                            className="h-8 w-8 rounded-full text-destructive opacity-60 hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                            title="Excluir permanentemente"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
