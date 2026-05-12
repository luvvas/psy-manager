import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { NewPatientForm } from "./components/patient-form";
import { PatientsTable, type DBPatient } from "./components/patients-table";
import { AppSheet } from "@/components/layout/app-sheet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function PacientesPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<DBPatient | null>(null);
    const navigate = useNavigate();

    const { data: dbPatients, refetch } = trpc.patient.list.useQuery(undefined, {
        retry: false,
    });

    const createPatientMutation = trpc.patient.create.useMutation({
        onSuccess: () => {
            toast.success("Paciente cadastrado com sucesso!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao cadastrar: ${err.message}`);
        },
    });

    const updatePatientMutation = trpc.patient.update.useMutation({
        onSuccess: () => {
            toast.success("Paciente atualizado com sucesso!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar: ${err.message}`);
        },
    });

    const deletePatientMutation = trpc.patient.delete.useMutation({
        onSuccess: () => {
            toast.success("Paciente excluído com sucesso!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao excluir: ${err.message}`);
        },
    });

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
                await updatePatientMutation.mutateAsync({
                    id: editingPatient.id,
                    ...newPatient
                });
            } else {
                await createPatientMutation.mutateAsync(newPatient);
            }
            setSheetOpen(false);
            setEditingPatient(null);
        } catch (error) {
            console.error("Erro ao salvar paciente:", error);
        }
    };

    const handleDeletePatient = async (id: string, name: string) => {
        if (window.confirm(`Deseja realmente excluir o paciente "${name}"?`)) {
            try {
                await deletePatientMutation.mutateAsync({ id });
            } catch (error) {
                console.error("Erro ao excluir paciente:", error);
            }
        }
    };

    return (
        <>
            <AppHeader
                title="Pacientes"
                description="Gerencie os cadastros, contatos e dados clínicos de seus pacientes."
                icon={Users}
                actions={
                    <>
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
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <PatientsTable
                    patients={allPatients}
                    onEdit={(patient) => {
                        setEditingPatient(patient);
                        setSheetOpen(true);
                    }}
                    onDelete={handleDeletePatient}
                    onViewProfile={(patient) => {
                        navigate(`/pacientes/${patient.id}`);
                    }}
                />
            </div>
        </>
    );
}
