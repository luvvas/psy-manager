import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Users, Plus, UploadCloud, ArrowRight, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewPatientForm } from "./components/patient-form";
import { PatientsTable, type DBPatient } from "./components/patients-table";
import { PatientCsvImporter, PATIENT_REQUIRED_FIELDS, type PatientFieldId } from "./components/patient-csv-importer";
import { AppSheet } from "@/components/layout/app-sheet";
import { parseDate } from "@/utils/csv";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import Papa from "papaparse";

export function PacientesPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<DBPatient | null>(null);
    const [activeTab, setActiveTab] = useState("lista");
    const [csvData, setCsvData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
    const [mappings, setMappings] = useState<Record<string, PatientFieldId | "skip">>({});
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const { data: dbPatients, refetch } = trpc.patient.list.useQuery(undefined, { retry: false });

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
            setCsvData(null);
            refetch();
            setActiveTab("lista");
        },
        onError: (err) => toast.error(`Erro na importação: ${err.message}`),
        onSettled: () => setIsImporting(false),
    });

    useEffect(() => {
        if (csvData) {
            const initial: Record<string, PatientFieldId | "skip"> = {};
            csvData.headers.forEach((_, idx) => { initial[idx] = "skip"; });
            setMappings(initial);
        } else {
            setMappings({});
        }
    }, [csvData]);

    const allPatients: DBPatient[] = (dbPatients || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        telefone: p.telefone,
        dataNascimento: new Date(p.dataNascimento),
        cidade: p.cidade,
        cpf: p.cpf,
        valorSessao: p.valorSessao ?? null,
        modeloCobranca: p.modeloCobranca ?? null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt || p.createdAt),
    }));

    const handleSavePatient = async (newPatient: any) => {
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

    const processFile = (file: File) => {
        Papa.parse(file, {
            complete: (results) => {
                const data = results.data as any[][];
                if (data.length > 0) {
                    const headers = data[0].map((h: any) => String(h).trim());
                    const rows = data.slice(1).filter(row => row.length > 1 || row[0] !== "");
                    setCsvData({ headers, rows });
                    setActiveTab("importacao");
                    toast.success(`Arquivo "${file.name}" carregado!`);
                } else {
                    toast.error("Arquivo está vazio.");
                }
            },
            error: (error) => toast.error(`Erro ao ler CSV: ${error.message}`),
            skipEmptyLines: true,
        });
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        processFile(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleMappingChange = (columnIndex: string, value: PatientFieldId | "skip") => {
        setMappings((prev) => ({ ...prev, [columnIndex]: value }));
    };

    const mappedFieldsValues = Object.values(mappings);
    const requiredFieldCount = PATIENT_REQUIRED_FIELDS.length;
    const mappedCount = PATIENT_REQUIRED_FIELDS.filter(f => mappedFieldsValues.includes(f.id)).length;
    const isMappingComplete = mappedCount === requiredFieldCount;

    const handleConfirmImport = async () => {
        if (!csvData || !isMappingComplete) return;
        setIsImporting(true);
        try {
            const reverseMap: Record<string, number> = {};
            Object.entries(mappings).forEach(([colIdx, fieldId]) => {
                if (fieldId !== "skip") reverseMap[fieldId] = parseInt(colIdx, 10);
            });

            const getCell = (row: any[], field: string): string | null => {
                const idx = reverseMap[field];
                if (idx === undefined) return null;
                const val = String(row[idx] ?? "").trim();
                return val || null;
            };

            const payload = csvData.rows
                .filter(row => row.some((cell: any) => cell !== null && cell !== ""))
                .map(row => ({
                    nome: getCell(row, "nome") ?? "",
                    email: getCell(row, "email") ?? "",
                    telefone: getCell(row, "telefone") ?? "",
                    dataNascimento: parseDate(getCell(row, "dataNascimento") ?? ""),
                    cpf: getCell(row, "cpf") ?? "",
                    cidade: getCell(row, "cidade") ?? "",
                    valorSessao: getCell(row, "valorSessao"),
                    modeloCobranca: getCell(row, "modeloCobranca"),
                    nomeSocial: getCell(row, "nomeSocial"),
                    rg: getCell(row, "rg"),
                    profissao: getCell(row, "profissao"),
                    endereco: getCell(row, "endereco"),
                    cep: getCell(row, "cep"),
                    uf: getCell(row, "uf"),
                    contatoEmergencia: getCell(row, "contatoEmergencia"),
                    respLegalNome: getCell(row, "respLegalNome"),
                    respLegalParentesco: getCell(row, "respLegalParentesco"),
                    respLegalCpf: getCell(row, "respLegalCpf"),
                    respLegalTelefone: getCell(row, "respLegalTelefone"),
                    respLegalEmail: getCell(row, "respLegalEmail"),
                    servicoContratadoTipo: getCell(row, "servicoContratadoTipo"),
                    dataInicioAcompanhamento: (() => {
                        const v = getCell(row, "dataInicioAcompanhamento");
                        return v ? parseDate(v) : null;
                    })(),
                    formaPagamento: getCell(row, "formaPagamento"),
                    formaPagamentoDetalhe: getCell(row, "formaPagamentoDetalhe"),
                    responsavelFinanceiroTipo: getCell(row, "responsavelFinanceiroTipo"),
                    responsavelFinanceiroDetalhe: getCell(row, "responsavelFinanceiroDetalhe"),
                    origemContato: getCell(row, "origemContato"),
                    origemContatoDetalhe: getCell(row, "origemContatoDetalhe"),
                }));

            await createManyMutation.mutateAsync(payload);
        } catch (err) {
            logger.error("Erro", err);
            setIsImporting(false);
        }
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
                                {csvData && (
                                    <span className="absolute top-1 right-1 size-2 bg-primary rounded-full animate-pulse" />
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === "importacao" && csvData && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCsvData(null)}
                                    disabled={isImporting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1.5 shadow-sm min-w-30"
                                    disabled={!isMappingComplete || isImporting}
                                    onClick={handleConfirmImport}
                                >
                                    {isImporting ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <>Importar {mappedCount}/{requiredFieldCount}</>
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
                        <PatientCsvImporter
                            csvData={csvData}
                            mappings={mappings}
                            onMappingChange={handleMappingChange}
                            onFileSelect={processFile}
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
                    initialData={
                        editingPatient
                            ? {
                                nome: editingPatient.nome,
                                email: editingPatient.email,
                                telefone: editingPatient.telefone,
                                dataNascimento: editingPatient.dataNascimento,
                                cidade: editingPatient.cidade,
                                cpf: editingPatient.cpf,
                                valorSessao: editingPatient.valorSessao ?? undefined,
                                modeloCobranca: editingPatient.modeloCobranca ?? undefined,
                            }
                            : undefined
                    }
                />
            </AppSheet>
        </>
    );
}
