import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Users, Plus, Mail, Phone, Calendar, MapPin, CreditCard, Pencil, Trash2 } from "lucide-react";
import { NewPatientForm } from "./components/new-patient-form";
import { AppSheet } from "@/components/layout/app-sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DBPatient {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    dataNascimento: Date;
    cidade: string;
    cpf: string;
    createdAt: Date;
    updatedAt: Date;
}

export function PacientesPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<DBPatient | null>(null);

    // Load actual patients via tRPC
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

    // Map database patients with properly parsed dates
    const allPatients: DBPatient[] = (dbPatients || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        telefone: p.telefone,
        dataNascimento: new Date(p.dataNascimento),
        cidade: p.cidade,
        cpf: p.cpf,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt || p.createdAt),
    }));

    const handleSavePatient = async (newPatient: {
        nome: string;
        email: string;
        telefone: string;
        dataNascimento: string;
        cidade: string;
        cpf: string;
    }) => {
        try {
            if (editingPatient) {
                await updatePatientMutation.mutateAsync({
                    id: editingPatient.id,
                    nome: newPatient.nome,
                    email: newPatient.email,
                    telefone: newPatient.telefone,
                    dataNascimento: new Date(newPatient.dataNascimento),
                    cidade: newPatient.cidade,
                    cpf: newPatient.cpf,
                });
            } else {
                await createPatientMutation.mutateAsync({
                    nome: newPatient.nome,
                    email: newPatient.email,
                    telefone: newPatient.telefone,
                    dataNascimento: new Date(newPatient.dataNascimento),
                    cidade: newPatient.cidade,
                    cpf: newPatient.cpf,
                });
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

    const columns: DataTableColumn<DBPatient>[] = [
        {
            header: "Nome",
            className: "w-[28%]",
            render: (patient) => (
                <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground block">
                        {patient.nome}
                    </span>
                    <span className="text-xs text-muted-foreground block md:hidden">
                        {patient.email}
                    </span>
                </div>
            ),
        },
        {
            header: "Contato",
            className: "w-[28%]",
            render: (patient) => (
                <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs md:text-sm">
                        <Mail className="size-3.5 shrink-0" />
                        {patient.email}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Phone className="size-3.5 shrink-0" />
                        {patient.telefone}
                    </span>
                </div>
            ),
        },
        {
            header: "CPF",
            className: "w-[15%]",
            render: (patient) => (
                <span className="font-mono text-xs flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="size-3.5" />
                    {patient.cpf}
                </span>
            ),
        },
        {
            header: "Nascimento",
            className: "w-[12%]",
            render: (patient) => (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    {patient.dataNascimento.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        timeZone: "UTC"
                    })}
                </span>
            ),
        },
        {
            header: "Cidade",
            className: "w-[12%]",
            render: (patient) => (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {patient.cidade}
                </span>
            ),
        },
        {
            header: "",
            className: "w-[8%] text-right",
            render: (patient) => (
                <div className="flex justify-end items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingPatient(patient);
                            setSheetOpen(true);
                        }}
                    >
                        <Pencil className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePatient(patient.id, patient.nome);
                        }}
                    >
                        <Trash2 className="size-3.5 transition-colors" />
                    </Button>
                </div>
            ),
        },
    ];

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
                                            dataNascimento: new Date(
                                                editingPatient.dataNascimento.getTime() -
                                                editingPatient.dataNascimento.getTimezoneOffset() * 60000
                                            )
                                                .toISOString()
                                                .split("T")[0],
                                            cidade: editingPatient.cidade,
                                            cpf: editingPatient.cpf,
                                        }
                                        : undefined
                                }
                            />
                        </AppSheet>
                    </>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <DataTable
                    data={allPatients}
                    columns={columns}
                    searchPlaceholder="Buscar por nome, CPF ou e-mail..."
                    searchFilter={(patient, query) => {
                        const term = query.toLowerCase();
                        return (
                            patient.nome.toLowerCase().includes(term) ||
                            patient.cpf.includes(term) ||
                            patient.email.toLowerCase().includes(term)
                        );
                    }}
                    emptyState={{
                        title: "Nenhum paciente encontrado",
                        description: "Não encontramos pacientes cadastrados no banco de dados. Cadastre um novo para começar.",
                        icon: Users,
                    }}
                />
            </div>
        </>
    );
}
