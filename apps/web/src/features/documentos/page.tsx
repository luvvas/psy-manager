import { AppHeader } from "@/components/layout/app-header";
import { AppSheet } from "@/components/layout/app-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { uploadFileToTarget } from "@/utils/upload";
import { safeUrl } from "@/utils/safe-url";
import { ArrowLeft, Download, Files, FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { GenericDocumentForm, type GenericDocumentFormValues } from "./components/generic-document-form";
import { GenericDocumentsTable, type DBGenericDocument } from "./components/generic-documents-table";

export function DocumentosPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<DBGenericDocument | null>(null);
    const [viewingDoc, setViewingDoc] = useState<DBGenericDocument | null>(null);
    const [activeTab, setActiveTab] = useState("todos");
    const utils = trpc.useUtils();

    const { data: dbDocs, isPending: isLoadingDocs } = trpc.document.list.useQuery({});

    const { data: downloadData } = trpc.document.getDownloadUrl.useQuery(
        { id: viewingDoc?.id || "" },
        { enabled: !!viewingDoc }
    );

    const prepareUploadMutation = trpc.document.prepareUpload.useMutation();

    const createMutation = trpc.document.create.useMutation({
        onSuccess: () => {
            toast.success("Documento criado com sucesso!");
            utils.document.list.invalidate();
            setSheetOpen(false);
        },
        onError: (err) => {
            toast.error(`Erro ao criar: ${err.message}`);
        },
    });

    const updateMutation = trpc.document.update.useMutation({
        onSuccess: () => {
            toast.success("Documento atualizado!");
            utils.document.list.invalidate();
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
            utils.document.list.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro ao excluir: ${err.message}`);
        },
    });

    const allDocuments: DBGenericDocument[] = useMemo(() =>
        (dbDocs || []).map((d) => ({
            id: d.id,
            title: d.title,
            type: d.type,
            isTemplate: d.isTemplate,
            updatedAt: new Date(d.updatedAt),
            content: d.content,
            storageKey: d.storageKey,
        })),
        [dbDocs]
    );

    const documentos = useMemo(() => allDocuments.filter((d) => !d.isTemplate), [allDocuments]);
    const modelos = useMemo(() => allDocuments.filter((d) => d.isTemplate), [allDocuments]);

    const handleSave = async (data: GenericDocumentFormValues) => {
        const { file, ...metadata } = data;
        const uploadMetadata = file
            ? await (async () => {
                const target = await prepareUploadMutation.mutateAsync({
                    fileName: file.name,
                    contentType: "application/pdf",
                    fileSize: file.size,
                });
                await uploadFileToTarget(file, target);
                return {
                    storageKey: target.storageKey,
                    fileName: file.name,
                    mimeType: file.type,
                    fileSize: file.size,
                    content: undefined,
                };
            })()
            : {};

        if (editingDoc) {
            await updateMutation.mutateAsync({
                id: editingDoc.id,
                ...metadata,
                ...uploadMetadata,
            });
        } else {
            await createMutation.mutateAsync({
                ...metadata,
                ...uploadMetadata,
            });
        }
    };

    const handleDelete = (id: string, title: string) => {
        if (window.confirm(`Deseja realmente excluir "${title}"? Esta ação não pode ser revertida.`)) {
            deleteMutation.mutate(
                { id },
                {
                    onSuccess: () => {
                        if (viewingDoc?.id === id) setViewingDoc(null);
                    },
                }
            );
        }
    };

    const handleDownload = () => {
        const url = safeUrl(downloadData?.url || viewingDoc?.content, { allowPdfDataUrl: true });
        if (!url || !viewingDoc) return;
        const link = document.createElement("a");
        link.href = url;
        link.download = `${viewingDoc.title}.pdf`;
        link.click();
    };

    const handleDownloadDocument = async (doc: DBGenericDocument) => {
        const data = await utils.document.getDownloadUrl.fetch({ id: doc.id });
        const url = safeUrl(data?.url || doc.content, { allowPdfDataUrl: true });
        if (!url) return;

        const link = document.createElement("a");
        link.href = url;
        link.download = `${doc.title}.pdf`;
        link.click();
    };

    if (viewingDoc) {
        const viewerUrl = safeUrl(downloadData?.url || viewingDoc.content, { allowPdfDataUrl: true });
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
                {viewerUrl ? (
                    <iframe
                        src={`${viewerUrl}#toolbar=0`}
                        className="w-full h-full border-none"
                        title={viewingDoc.title}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full bg-muted/30 border rounded-lg border-dashed">
                        <p className="text-muted-foreground">Nenhum conteúdo encontrado para este arquivo.</p>
                    </div>
                )}
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
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => {
                                setEditingDoc(null);
                                setSheetOpen(true);
                            }}
                            className="gap-1.5"
                        >
                            <Plus className="size-4" />
                            Novo Documento
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <TabsList className="grid w-full max-w-2/6 grid-cols-3">
                            <TabsTrigger value="todos">Todos</TabsTrigger>
                            <TabsTrigger value="documentos">Documentos</TabsTrigger>
                            <TabsTrigger value="modelos">Modelos</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="todos" className="outline-none">
                        <GenericDocumentsTable
                            isLoading={isLoadingDocs}
                            documents={allDocuments}
                            onViewDocument={(doc) => setViewingDoc(doc)}
                            onDownloadDocument={handleDownloadDocument}
                            onEditMetadata={(doc) => { setEditingDoc(doc); setSheetOpen(true); }}
                            onDelete={handleDelete}
                        />
                    </TabsContent>

                    <TabsContent value="documentos" className="outline-none">
                        <GenericDocumentsTable
                            isLoading={isLoadingDocs}
                            documents={documentos}
                            onViewDocument={(doc) => setViewingDoc(doc)}
                            onDownloadDocument={handleDownloadDocument}
                            onEditMetadata={(doc) => { setEditingDoc(doc); setSheetOpen(true); }}
                            onDelete={handleDelete}
                        />
                    </TabsContent>

                    <TabsContent value="modelos" className="outline-none">
                        <GenericDocumentsTable
                            isLoading={isLoadingDocs}
                            documents={modelos}
                            onViewDocument={(doc) => setViewingDoc(doc)}
                            onDownloadDocument={handleDownloadDocument}
                            onEditMetadata={(doc) => { setEditingDoc(doc); setSheetOpen(true); }}
                            onDelete={handleDelete}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <AppSheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setSheetOpen(open);
                    if (!open) setEditingDoc(null);
                }}
                title={editingDoc ? "Editar Documento" : "Novo Documento"}
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
    );
}
