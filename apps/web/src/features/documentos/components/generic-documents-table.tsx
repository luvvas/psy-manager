import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Download, Eye, FileText, Settings2, Trash2 } from "lucide-react";

export interface DBGenericDocument {
    id: string;
    title: string;
    type: string;
    isTemplate: boolean;
    updatedAt: Date;
    content: string | null;
    storageKey?: string | null;
}

interface GenericDocumentsTableProps {
    documents: DBGenericDocument[];
    onViewDocument: (doc: DBGenericDocument) => void;
    onDownloadDocument: (doc: DBGenericDocument) => void;
    onEditMetadata: (doc: DBGenericDocument) => void;
    onDelete: (id: string, title: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
    template: "Outro",
    contrato: "Contrato",
    materiais: "Material",
    formulario: "Formulário",
    outro: "Outro",
};

export function GenericDocumentsTable({ documents, onViewDocument, onDownloadDocument, onEditMetadata, onDelete }: GenericDocumentsTableProps) {
    const columns: DataTableColumn<DBGenericDocument>[] = [
        {
            header: "Documento",
            render: (doc) => (
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
            ),
        },
        {
            header: "Categoria",
            className: "w-[160px]",
            render: (doc) => (
                <Badge variant="secondary" className="font-medium capitalize bg-muted/50">
                    {TYPE_LABELS[doc.type] || doc.type}
                </Badge>
            ),
        },
        {
            header: "Última Atualização",
            className: "w-[180px]",
            render: (doc) => (
                <span className="text-muted-foreground text-sm">
                    {format(new Date(doc.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
            ),
        },
        {
            header: "Ações",
            className: "w-[180px] text-right pr-6",
            render: (doc) => (
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
                        onClick={() => onDownloadDocument(doc)}
                        className="h-8 w-8 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                        disabled={!doc.content && !doc.storageKey}
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
            ),
        },
    ];

    return (
        <DataTable
            data={documents}
            columns={columns}
            searchPlaceholder="Buscar por título..."
            searchFilter={(doc, q) => doc.title.toLowerCase().includes(q.toLowerCase())}
            getRowKey={(doc) => doc.id}
            emptyState={{
                title: "Nenhum documento encontrado",
                description: "Sua biblioteca está vazia ou nenhum item corresponde à busca.",
                icon: FileText,
            }}
        />
    );
}
