import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import type { RouterOutputs } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, ExternalLink, FileText, Pencil, Trash2 } from "lucide-react";

export type GenericDocument = RouterOutputs["document"]["list"][number];

interface GenericDocumentsTableProps {
    documents: GenericDocument[];
    isLoading?: boolean;
    onOpen: (doc: GenericDocument) => void;
    onDownload: (doc: GenericDocument) => void;
    onEdit: (doc: GenericDocument) => void;
    onDelete: (id: string, title: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
    template: "Modelo",
    contrato: "Contrato",
    materiais: "Material",
    formulario: "Formulário",
    outro: "Outro",
};

export function GenericDocumentsTable({ documents, isLoading, onOpen, onDownload, onEdit, onDelete }: GenericDocumentsTableProps) {
    const columns: DataTableColumn<GenericDocument>[] = [
        {
            header: "Documento",
            className: "w-[46%]",
            render: (doc) => (
                <div className="flex items-center gap-3 py-1">
                    <div className="rounded-lg bg-secondary p-2 text-secondary-foreground">
                        <FileText className="size-4" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-foreground">{doc.title}</span>
                        {doc.isTemplate && (
                            <Badge
                                variant="outline"
                                className="mt-1 h-4 border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300"
                            >
                                Modelo
                            </Badge>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: "Categoria",
            className: "w-[20%]",
            render: (doc) => (
                <Badge variant="secondary" className="font-medium">
                    {TYPE_LABELS[doc.type] ?? doc.type}
                </Badge>
            ),
        },
        {
            header: "Última Atualização",
            className: "w-[22%]",
            render: (doc) => (
                <span className="text-xs text-muted-foreground">
                    {format(doc.updatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
            ),
        },
        {
            header: "",
            className: "w-[12%] text-right",
            render: (doc) => {
                const hasFile = !!doc.content || !!doc.storageKey;
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Editar"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(doc);
                            }}
                        >
                            <Pencil className="size-3.5 text-muted-foreground transition-colors hover:text-foreground" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Abrir"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpen(doc);
                            }}
                        >
                            <ExternalLink className="size-3.5 text-muted-foreground transition-colors hover:text-foreground" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Baixar PDF"
                            disabled={!hasFile}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDownload(doc);
                            }}
                        >
                            <Download className="size-3.5 text-muted-foreground transition-colors hover:text-foreground" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Deletar"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(doc.id, doc.title);
                            }}
                        >
                            <Trash2 className="size-3.5" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <DataTable
            data={documents}
            isLoading={isLoading}
            columns={columns}
            searchPlaceholder="Buscar por título..."
            searchFilter={(doc, q) => doc.title.toLowerCase().includes(q.toLowerCase())}
            emptyState={{
                title: "Nenhum documento encontrado",
                description: "Sua biblioteca está vazia ou nenhum item corresponde à busca.",
                icon: FileText,
            }}
        />
    );
}
