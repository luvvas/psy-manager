import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { FileText, Plus, ArrowLeft, Download, Files } from "lucide-react";
import { AppSheet } from "@/components/layout/app-sheet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { GenericDocumentForm } from "./components/generic-document-form";
import { GenericDocumentsTable, type DBGenericDocument } from "./components/generic-documents-table";

export function DocumentosPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<DBGenericDocument | null>(null);
    const [viewingDoc, setViewingDoc] = useState<DBGenericDocument | null>(null);

    // Fetches only generic documents without direct patient links as per documentService filtering rules implicitly
    const { data: dbDocs, refetch } = trpc.document.list.useQuery(
        {},
        { retry: false }
    );

    const createMutation = trpc.document.create.useMutation({
        onSuccess: () => {
            toast.success("Documento criado com sucesso!");
            refetch();
            setSheetOpen(false);
        },
        onError: (err) => {
            toast.error(`Erro ao criar: ${err.message}`);
        },
    });

    const updateMutation = trpc.document.update.useMutation({
        onSuccess: () => {
            toast.success("Documento atualizado!");
            refetch();
            setSheetOpen(false);
            setEditingDoc(null);
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar: ${err.message}`);
        },
    });

    const deleteMutation = trpc.document.delete.useMutation({
        onSuccess: () => {
            toast.success("Documento removido permanentemente.");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao excluir: ${err.message}`);
        },
    });

    // Re-map the existing basic docs directly to the simple library types
    const allDocuments: DBGenericDocument[] = (dbDocs || []).map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        isTemplate: d.isTemplate,
        updatedAt: new Date(d.updatedAt),
        content: d.content,
    }));

    const handleSave = async (data: any) => {
        if (editingDoc) {
            await updateMutation.mutateAsync({
                id: editingDoc.id,
                ...data,
            });
        } else {
            await createMutation.mutateAsync({
                ...data,
            });
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (confirm(`Tem certeza que deseja excluir permanentemente "${title}"? Esta ação não pode ser revertida.`)) {
            await deleteMutation.mutateAsync({ id });
            if (viewingDoc?.id === id) {
                setViewingDoc(null);
            }
        }
    };

    const handleDownload = () => {
        if (!viewingDoc?.content) return;
        const link = document.createElement("a");
        link.href = viewingDoc.content;
        link.download = `${viewingDoc.title}.pdf`;
        link.click();
    };

    if (viewingDoc) {
        return (
            <>
                <AppHeader
                    title={viewingDoc.title}
                    description="Visualizando arquivo de armazenamento"
                    icon={FileText}
                    actions={
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingDoc(null)}
                                className="gap-1.5"
                            >
                                <ArrowLeft className="size-4" />
                                Voltar
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleDownload}
                                className="gap-1.5"
                            >
                                <Download className="size-4" />
                                Baixar PDF
                            </Button>
                        </>
                    }
                />
                <div className="flex-1 flex flex-col h-[calc(100vh-120px)] rounded-lg overflow-hidden border bg-muted/5 mx-4 mb-4 lg:mx-6">
                    {viewingDoc.content ? (
                        <iframe
                            src={`${viewingDoc.content}#toolbar=0`}
                            className="w-full h-full border-none"
                            title={viewingDoc.title}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-muted/30 border rounded-lg border-dashed">
                            <p className="text-muted-foreground">Nenhum conteúdo encontrado para este arquivo.</p>
                        </div>
                    )}
                </div>
            </>
        );
    }

    return (
        <>
            <AppHeader
                title="Documentos e Modelos"
                description="Biblioteca central para armazenar seus PDFs, contratos genéricos e modelos de papelaria."
                icon={Files}
                actions={
                    <>
                        <Button
                            size="sm"
                            onClick={() => {
                                setEditingDoc(null);
                                setSheetOpen(true);
                            }}
                            className="gap-1.5 font-medium shadow-sm"
                        >
                            <Plus className="size-4" />
                            Novo Documento
                        </Button>

                        <AppSheet
                            open={isSheetOpen}
                            onOpenChange={(open) => {
                                setSheetOpen(open);
                                if (!open) setEditingDoc(null);
                            }}
                            title={editingDoc ? "Editar Arquivo" : "Adicionar à Biblioteca"}
                        >
                            <GenericDocumentForm
                                key={editingDoc ? editingDoc.id : "new"}
                                onSave={handleSave}
                                onCancel={() => {
                                    setSheetOpen(false);
                                    setEditingDoc(null);
                                }}
                                initialData={
                                    editingDoc
                                        ? {
                                            title: editingDoc.title,
                                            type: editingDoc.type,
                                            isTemplate: editingDoc.isTemplate,
                                        }
                                        : undefined
                                }
                            />
                        </AppSheet>
                    </>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="space-y-4">
                    <GenericDocumentsTable
                        documents={allDocuments}
                        onViewDocument={(doc) => setViewingDoc(doc)}
                        onEditMetadata={(doc) => {
                            setEditingDoc(doc);
                            setSheetOpen(true);
                        }}
                        onDelete={handleDelete}
                    />
                </div>
            </div>
        </>
    );
}
