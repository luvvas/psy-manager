import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Users, Plus, UploadCloud, ArrowRight, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewPatientForm, type PatientFormValues } from "./components/patient-form";
import { PatientsTable, type DBPatient } from "./components/patients-table";
import { mapCsvRowsToPatients, PATIENT_CSV_FIELDS } from "./csv-import";
import { CsvColumnMapper } from "@/components/csv-import/csv-column-mapper";
import { useCsvImport } from "@/components/csv-import/use-csv-import";
import { AppSheet } from "@/components/layout/app-sheet";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export function PacientesPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<DBPatient | null>(null);
    const [activeTab, setActiveTab] = useState("lista");
    const csv = useCsvImport(PATIENT_CSV_FIELDS);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const { data: dbPatients, refetch } = trpc.patient.list.useQuery();

    const createPatientMutation = trpc.patient.create.useMutation({
        onSuccess: () => {
            toast.success("Paciente cadastrado com sucesso!");
            refetch();
        },
        onError: (err) => toast.error(`Erro ao cadastrar: ${err.message}`),
    });

    const updatePatientMutation = trpc.patient.update.useMutation({
        onSuccess: () => {
            toast.success("Paciente atualizado com sucesso!");
            refetch();
        },
        onError: (err) => toast.error(`Erro ao atualizar: ${err.message}`),
    });

    const deletePatientMutation = trpc.patient.delete.useMutation({
        onSuccess: () => {
            toast.success("Paciente excluído com sucesso!");
            refetch();
        },
        onError: (err) => toast.error(`Erro ao excluir: ${err.message}`),
    });

    const createManyMutation = trpc.patient.createMany.useMutation({
        onSuccess: (data) => {
            toast.success(`${data.count} paciente(s) importado(s) com sucesso!`);
            csv.reset();
            refetch();
            setActiveTab("lista");
        },
        onError: (err) => toast.error(`Erro ao importar: ${err.message}`),
    });
    const isImporting = createManyMutation.isPending;

    const allPatients: DBPatient[] = (dbPatients || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        telefone: p.telefone,
        dataNascimento: p.dataNascimento ? new Date(p.dataNascimento) : null,
        cidade: p.cidade,
        cpf: p.cpf,
        valorSessao: p.valorSessao ?? null,
        modeloCobranca: p.modeloCobranca ?? null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt || p.createdAt),
    }));

    const editingRecord = editingPatient ? dbPatients?.find((p) => p.id === editingPatient.id) : undefined;
    const editingPatientRecord = editingRecord && {
        ...editingRecord,
        // A coluna é texto cifrado; a API devolve a data já decriptada.
        dataNascimento: editingRecord.dataNascimento ? new Date(editingRecord.dataNascimento) : null,
    };

    const handleSavePatient = async (newPatient: PatientFormValues) => {
        try {
            if (editingPatient) {
                await updatePatientMutation.mutateAsync({ id: editingPatient.id, ...newPatient });
            } else {
                await createPatientMutation.mutateAsync(newPatient);
            }
            setSheetOpen(false);
            setEditingPatient(null);
        } catch (error) {
            logger.error("Erro ao salvar paciente", error);
        }
    };

    const handleDeletePatient = async (id: string, name: string) => {
        if (window.confirm(`Deseja realmente excluir o paciente "${name}"?`)) {
            try {
                await deletePatientMutation.mutateAsync({ id });
            } catch (error) {
                logger.error("Erro ao excluir paciente", error);
            }
        }
    };

    const handleLoadFile = async (file: File) => {
        if (await csv.loadFile(file)) setActiveTab("importacao");
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        void handleLoadFile(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleConfirmImport = () => {
        if (!csv.csvData || !csv.isMappingComplete) return;
        createManyMutation.mutate(mapCsvRowsToPatients(csv.csvData.rows, csv.mappings));
    };

    return (
        <>
            <AppHeader
                title="Pacientes"
                description="Gerencie os cadastros, contatos e dados clínicos de seus pacientes."
                icon={Users}
                actions={
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileSelect}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 hidden sm:flex"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UploadCloud className="size-4" />
                            Importar .csv
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                setEditingPatient(null);
                                setSheetOpen(true);
                            }}
                            className="gap-1.5"
                            id="btn-new-patient"
                        >
                            <Plus className="size-4" />
                            Novo Paciente
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <TabsList className="grid w-full max-w-xs grid-cols-2">
                            <TabsTrigger value="lista">Lista</TabsTrigger>
                            <TabsTrigger value="importacao" className="relative">
                                Importação
                                {csv.csvData && (
                                    <span className="absolute top-1 right-1 size-2 bg-primary rounded-full animate-pulse" />
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === "importacao" && csv.csvData && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={csv.reset}
                                    disabled={isImporting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1.5 shadow-sm min-w-30"
                                    disabled={!csv.isMappingComplete || isImporting}
                                    onClick={handleConfirmImport}
                                >
                                    {isImporting ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <>Importar {csv.mappedRequiredCount}/{csv.requiredCount}</>
                                    )}
                                    {!isImporting && <ArrowRight className="size-3.5" />}
                                </Button>
                            </div>
                        )}
                    </div>

                    <TabsContent value="lista" className="outline-none">
                        <PatientsTable
                            patients={allPatients}
                            onEdit={(patient) => {
                                setEditingPatient(patient);
                                setSheetOpen(true);
                            }}
                            onDelete={handleDeletePatient}
                            onViewProfile={(patient) => navigate(`/pacientes/${patient.id}`)}
                        />
                    </TabsContent>

                    <TabsContent value="importacao" className="flex-1 flex flex-col space-y-4 outline-none">
                        <CsvColumnMapper
                            fields={PATIENT_CSV_FIELDS}
                            csvData={csv.csvData}
                            mappings={csv.mappings}
                            onMappingChange={csv.setMapping}
                            onFileSelect={handleLoadFile}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <AppSheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setSheetOpen(open);
                    if (!open) setEditingPatient(null);
                }}
                title={editingPatient ? "Editar Paciente" : "Novo Paciente"}
            >
                <NewPatientForm
                    key={editingPatient ? editingPatient.id : "new"}
                    onSave={handleSavePatient}
                    onCancel={() => {
                        setSheetOpen(false);
                        setEditingPatient(null);
                    }}
                    // Registro completo da API, não a versão resumida da tabela: o form envia
                    // todos os campos no update, e o que não viesse aqui seria apagado.
                    initialData={editingPatientRecord}
                />
            </AppSheet>
        </>
    );
}
