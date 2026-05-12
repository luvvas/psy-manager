import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { FileText, Lock, FileCheck, ClipboardCopy, Download, Eye, ArrowLeft, Paperclip, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface PatientTimelineProps {
    patientId: string;
}

const CATEGORY_ICONS: Record<string, any> = {
    evolucao: ClipboardCopy,
    contrato: FileCheck,
    atestado: FileText,
    laudo: FileText,
    documento_externo: Paperclip,
    teste_psicologico: FileSpreadsheet,
    outro: FileText,
};

export function PatientTimeline({ patientId }: PatientTimelineProps) {
    const [viewingDoc, setViewingDoc] = useState<any | null>(null);

    const { data: records, refetch, isLoading } = trpc.clinicalRecord.list.useQuery(
        { patientId },
        { retry: false }
    );

    const finalizeMutation = trpc.clinicalRecord.finalize.useMutation({
        onSuccess: () => {
            toast.success("Registro finalizado e assinado!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao finalizar: ${err.message}`);
        },
    });

    const handleFinalize = async (id: string, title: string) => {
        if (confirm(`Tem certeza que deseja FINALIZAR "${title}"? \nUma vez finalizado, este prontuário não poderá ser editado ou excluído.`)) {
            await finalizeMutation.mutateAsync({ id });
        }
    };

    const handleDownload = (content: string, title: string) => {
        if (!content) return;
        const link = document.createElement("a");
        link.href = content;
        link.download = `${title}.pdf`;
        link.click();
    };

    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground">Carregando prontuário...</div>;
    }

    if (viewingDoc) {
        return (
            <div className="flex flex-col h-full relative">
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => setViewingDoc(null)} className="gap-1.5">
                            <ArrowLeft className="w-4 h-4" /> Voltar à Linha do Tempo
                        </Button>
                        <h3 className="font-medium text-lg">{viewingDoc.title}</h3>
                    </div>
                    <Button size="sm" onClick={() => handleDownload(viewingDoc.fileUrl, viewingDoc.title)} className="gap-1.5">
                        <Download className="size-4" /> Baixar PDF
                    </Button>
                </div>
                <div className="flex-1 rounded-md overflow-hidden border bg-muted/20">
                    {viewingDoc.fileUrl ? (
                        <iframe
                            src={`${viewingDoc.fileUrl}#toolbar=0`}
                            className="w-full h-full border-none"
                            title={viewingDoc.title}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Nenhum conteúdo PDF encontrado neste registro.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Timeline Content */}
            <div className="flex-1 overflow-y-auto pr-4 pb-12 pt-1">
                {!records || records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed bg-muted/10">
                        <ClipboardCopy className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
                        <h4 className="font-medium">Nenhum registro encontrado</h4>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            O prontuário deste paciente está vazio. Comece adicionando a anamnese ou primeira evolução.
                        </p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-8">
                        {records.map((record) => {
                            const Icon = CATEGORY_ICONS[record.category] || FileText;
                            const isFinalized = record.status === "finalized";
                            const dateStr = format(new Date(record.dateOfService), "dd 'de' MMMM, yyyy", { locale: ptBR });

                            return (
                                <div key={record.id} className="relative pl-8">
                                    {/* Timeline dot */}
                                    <div className="absolute -left-[17px] top-1 rounded-full p-1">
                                        <div className="rounded-full bg-primary p-2">
                                            <Icon className="w-4 h-4 text-primary-foreground" />
                                        </div>
                                    </div>

                                    {/* Content Card */}
                                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold leading-none">{record.title}</h4>
                                                    {isFinalized ? (
                                                        <Badge variant="outline" className="text-[10px] h-5 border-green-500 text-green-600 bg-green-50/50">
                                                            <Lock className="w-3 h-3 mr-1" /> Assinado
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] h-5">
                                                            Rascunho
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground capitalize">
                                                    {record.category.replace("_", " ")} • {dateStr}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {record.fileUrl && (
                                                    <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setViewingDoc(record)}>
                                                        <Eye className="w-4 h-4" /> Ver Anexo
                                                    </Button>
                                                )}
                                                {!isFinalized && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 gap-1.5"
                                                        onClick={() => handleFinalize(record.id, record.title)}
                                                    >
                                                        <Lock className="w-4 h-4" /> Assinar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
