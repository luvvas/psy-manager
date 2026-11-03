import { AppHeader } from "@/components/layout/app-header";
import { AppSheet } from "@/components/layout/app-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentForm, type ClinicalRecordFormValues } from "@/features/documentos/components/document-form";
import { PatientTimeline } from "@/features/pacientes/components/patient-timeline";
import { trpc } from "@/lib/trpc";
import { uploadFileToTarget } from "@/utils/upload";
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function PatientDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isSheetOpen, setSheetOpen] = useState(false);

    // Using useUtils instead of useContext as confirmed across typical v10 usages or standard TRPC patterns in codebase
    const utils = trpc.useUtils();

    const { data: patient, isLoading } = trpc.patient.getById.useQuery(
        { id: id! },
        { enabled: !!id }
    );

    const createMutation = trpc.clinicalRecord.create.useMutation({
        onSuccess: () => {
            toast.success("Registro criado com sucesso!");
            // Invalidate specific patient timeline
            utils.clinicalRecord.list.invalidate({ patientId: id });
            setSheetOpen(false);
        },
        onError: (err) => {
            toast.error(`Erro ao criar: ${err.message}`);
        },
    });
    const prepareUploadMutation = trpc.clinicalRecord.prepareUpload.useMutation();

    const handleSave = async (data: ClinicalRecordFormValues) => {
        const { file, ...metadata } = data;
        const uploadMetadata = file
            ? await (async () => {
                const target = await prepareUploadMutation.mutateAsync({
                    fileName: file.name,
                    contentType: "application/pdf", // o formulário só aceita PDF
                    fileSize: file.size,
                });
                await uploadFileToTarget(file, target);
                return {
                    storageKey: target.storageKey,
                    fileName: file.name,
                    mimeType: file.type,
                    fileSize: file.size,
                    fileUrl: undefined,
                };
            })()
            : {};

        await createMutation.mutateAsync({
            ...metadata,
            ...uploadMetadata,
        });
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-6">
                <Skeleton className="h-12 w-64 mb-6" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-semibold mb-2">Paciente não encontrado</h2>
                <p className="text-muted-foreground mb-4">O paciente que você está procurando não existe ou foi removido.</p>
                <Button onClick={() => navigate("/pacientes")}>Voltar para Pacientes</Button>
            </div>
        );
    }

    const formPatients = [{ id: patient.id, nome: patient.nome }];

    return (
        <div className="flex flex-col flex-1 h-full">
            <AppHeader
                title={patient.nome}
                description="Prontuário do paciente"
                icon={ClipboardList}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate("/pacientes")} className="gap-2">
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </Button>
                        <Button size="sm" onClick={() => setSheetOpen(true)} className="gap-1.5">
                            <Plus className="size-4" />
                            Novo Prontuário
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
                <div className="flex-1 h-full overflow-hidden">
                    <PatientTimeline patientId={patient.id} />
                </div>
            </div>

            {/* Lifted Slide-over Form from timeline for cleaner page structure and visibility */}
            <AppSheet
                open={isSheetOpen}
                onOpenChange={setSheetOpen}
                title="Novo Registro Clínico"
            >
                <DocumentForm
                    onSave={handleSave}
                    onCancel={() => setSheetOpen(false)}
                    patients={formPatients}
                    initialData={{
                        title: "",
                        category: "evolucao",
                        patientId: id!,
                    }}
                />
            </AppSheet>
        </div>
    );
}
