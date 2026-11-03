import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { safeUrl } from "@/utils/safe-url";

export function DocumentoDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: doc, isLoading } = trpc.document.getById.useQuery({ id: id! }, { enabled: !!id });
    const { data: downloadData, isLoading: isLoadingUrl } = trpc.document.getDownloadUrl.useQuery(
        { id: id! },
        { enabled: !!id }
    );

    const goBack = () => navigate("/documentos");

    if (isLoading || isLoadingUrl) {
        return (
            <div className="flex-1 p-6">
                <Skeleton className="h-12 w-64 mb-6" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-semibold mb-2">Documento não encontrado</h2>
                <p className="text-muted-foreground mb-4">O documento que você procura não existe ou foi removido.</p>
                <Button onClick={goBack}>Voltar para Documentos</Button>
            </div>
        );
    }

    const viewerUrl = safeUrl(downloadData?.url || doc.content, { allowPdfDataUrl: true });

    const handleDownload = () => {
        if (!viewerUrl) {
            toast.error("Nenhum arquivo disponível para download.");
            return;
        }
        const link = document.createElement("a");
        link.href = viewerUrl;
        link.download = `${doc.title}.pdf`;
        link.click();
    };

    return (
        <div className="flex flex-col flex-1 h-full">
            <AppHeader
                title={doc.title}
                description="Visualização do arquivo armazenado"
                icon={FileText}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goBack} className="gap-2">
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={handleDownload} disabled={!viewerUrl}>
                            <Download className="size-4" />
                            Baixar
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 lg:p-6 overflow-hidden">
                <div className="flex-1 min-h-0">
                    {viewerUrl ? (
                        <iframe
                            src={`${viewerUrl}#toolbar=0`}
                            className="h-full w-full rounded-lg border"
                            title={doc.title}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/10">
                            <p className="text-sm text-muted-foreground">Nenhum conteúdo encontrado para este arquivo.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
