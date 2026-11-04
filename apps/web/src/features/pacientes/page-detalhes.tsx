import { AppHeader } from "@/components/layout/app-header";
import { AppSheet } from "@/components/layout/app-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClinicalRecordForm, type ClinicalRecordFormValues } from "./components/clinical-record-form";
import { PatientTimeline } from "./components/patient-timeline";
import { trpc } from "@/lib/trpc";
import { uploadFileToTarget } from "@/utils/upload";
import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeatureFlag } from "@/lib/feature-flags";
import { toast } from "sonner";

const PatientBilling = lazy(() =>
    import("./components/patient-billing").then((m) => ({ default: m.PatientBilling }))
);
const PatientBillingActions = lazy(() =>
    import("./components/patient-billing").then((m) => ({ default: m.PatientBillingActions }))
);

export function PatientDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() =>
        searchParams.get("aba") === "financeiro" ? "financeiro" : "prontuario"
    );
    const paymentsEnabled = useFeatureFlag("pagamentos");
    const currentTab = paymentsEnabled ? activeTab : "prontuario";
    const [isPaying, setIsPaying] = useState(false);

    const utils = trpc.useUtils();

    const { data: patient, isLoading } = trpc.patient.getById.useQuery(
        { id: id! },
        { enabled: !!id }
    );

    const createMutation = trpc.clinicalRecord.create.useMutation({
        onSuccess: () => {
            toast.success("Registro criado com sucesso!");
            utils.clinicalRecord.invalidate();
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
                    contentType: "application/pdf",
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
                        {currentTab === "prontuario" ? (
                            <Button size="sm" onClick={() => setSheetOpen(true)} className="gap-1.5">
                                <Plus className="size-4" />
                                Novo Registro
                            </Button>
                        ) : (
                            <Suspense fallback={null}>
                                <PatientBillingActions patientId={patient.id} onRegister={() => setIsPaying(true)} />
                            </Suspense>
                        )}
                    </div>
                }
            />

            <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 lg:p-6 overflow-hidden">
                {paymentsEnabled ? (
                    <Tabs value={currentTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 gap-4">
                        <TabsList className="grid w-full max-w-xs grid-cols-2">
                            <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
                            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                        </TabsList>
                        <TabsContent value="prontuario" className="flex-1 min-h-0 overflow-hidden outline-none">
                            <PatientTimeline patientId={patient.id} />
                        </TabsContent>
                        <TabsContent value="financeiro" className="flex-1 min-h-0 overflow-auto outline-none">
                            {currentTab === "financeiro" && (
                                <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                                    <PatientBilling patientId={patient.id} isPaying={isPaying} onPayingChange={setIsPaying} />
                                </Suspense>
                            )}
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <PatientTimeline patientId={patient.id} />
                    </div>
                )}
            </div>

            <AppSheet
                open={isSheetOpen}
                onOpenChange={setSheetOpen}
                title="Novo Registro"
            >
                <ClinicalRecordForm
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
