import { AppHeader } from "@/components/layout/app-header";
import { AppSheet } from "@/components/layout/app-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc";
import { uploadFileToTarget } from "@/utils/upload";
import { safeUrl } from "@/utils/safe-url";
import { Files, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { GenericDocumentForm, type GenericDocumentFormValues } from "./components/generic-document-form";
import { GenericDocumentsTable, type GenericDocument } from "./components/generic-documents-table";

type DocumentTab = "todos" | "documentos" | "modelos";

function isDocumentTab(value: string): value is DocumentTab {
    return value === "todos" || value === "documentos" || value === "modelos";
}

export function DocumentosPage() {
    const navigate = useNavigate();
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<GenericDocument | null>(null);
    const [activeTab, setActiveTab] = useState<DocumentTab>("todos");
    const utils = trpc.useUtils();

    const { data: allDocuments, isPending: isLoadingDocs } = trpc.document.list.useQuery({});

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
            toast.success("Documento atualizado com sucesso!");
            utils.document.invalidate();
            setSheetOpen(false);
            setEditingDoc(null);
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar: ${err.message}`);
        },
    });

    const deleteMutation = trpc.document.delete.useMutation({
        onSuccess: () => {
            toast.success("Documento excluído com sucesso!");
            utils.document.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro ao excluir: ${err.message}`);
        },
    });

    const documentsByTab = useMemo(() => {
        const documentos: GenericDocument[] = [];
        const modelos: GenericDocument[] = [];
        for (const doc of allDocuments ?? []) {
            if (doc.isTemplate) modelos.push(doc);
            else documentos.push(doc);
        }
        return { todos: allDocuments ?? [], documentos, modelos };
    }, [allDocuments]);

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
            deleteMutation.mutate({ id });
        }
    };

    const handleDownload = async (doc: GenericDocument) => {
        try {
            const data = await utils.document.getDownloadUrl.fetch({ id: doc.id });
            const url = safeUrl(data?.url || doc.content, { allowPdfDataUrl: true });
            if (!url) {
                toast.error("Nenhum arquivo disponível para download.");
                return;
            }

            const link = document.createElement("a");
            link.href = url;
            link.download = `${doc.title}.pdf`;
            link.click();
        } catch (error) {
            logger.error("Erro ao baixar documento", error);
            toast.error(`Erro ao baixar: ${error instanceof Error ? error.message : "tente novamente."}`);
        }
    };

    const openEdit = (doc: GenericDocument) => {
        setEditingDoc(doc);
        setSheetOpen(true);
    };

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
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => {
                        if (isDocumentTab(value)) setActiveTab(value);
                    }}
                >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <TabsList className="grid w-full max-w-xs grid-cols-3">
                            <TabsTrigger value="todos">Todos</TabsTrigger>
                            <TabsTrigger value="documentos">Documentos</TabsTrigger>
                            <TabsTrigger value="modelos">Modelos</TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>

                <GenericDocumentsTable
                    isLoading={isLoadingDocs}
                    documents={documentsByTab[activeTab]}
                    onOpen={(doc) => navigate(`/documentos/${doc.id}`)}
                    onDownload={handleDownload}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                />
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
