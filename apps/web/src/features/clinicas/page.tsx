import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Mail, Phone, MapPin, Pencil, Trash2, Users } from "lucide-react";
import { NewClinicForm, type ClinicFormValues } from "./components/clinic-form";
import { AppSheet } from "@/components/layout/app-sheet";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";

interface DBClinic {
    id: string;
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    psychologists: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
    }[];
}

export function ClinicasPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingClinic, setEditingClinic] = useState<DBClinic | null>(null);
    const { data: session } = useSession();

    // Load clinics via tRPC
    const { data: dbClinics, refetch } = trpc.clinic.list.useQuery(undefined, {
        retry: false,
    });

    const createMutation = trpc.clinic.create.useMutation({
        onSuccess: () => {
            toast.success("Clínica cadastrada com sucesso!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao cadastrar clínica: ${err.message}`);
        },
    });

    const updateMutation = trpc.clinic.update.useMutation({
        onSuccess: () => {
            toast.success("Clínica atualizada com sucesso!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar clínica: ${err.message}`);
        },
    });

    const deleteMutation = trpc.clinic.delete.useMutation({
        onSuccess: () => {
            toast.success("Clínica excluída com sucesso!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao excluir clínica: ${err.message}`);
        },
    });

    const linkMutation = trpc.clinic.linkPsychologist.useMutation({
        onSuccess: () => {
            refetch();
            // Trigger edit sheet reload by updating the current editing clinic
            if (editingClinic) {
                const updated = dbClinics?.find(c => c.id === editingClinic.id);
                if (updated) {
                    setEditingClinic({
                        ...updated,
                        createdAt: new Date(updated.createdAt),
                        updatedAt: new Date(updated.updatedAt),
                    });
                }
            }
        },
    });

    const unlinkMutation = trpc.clinic.unlinkPsychologist.useMutation({
        onSuccess: () => {
            refetch();
            if (editingClinic) {
                const updated = dbClinics?.find(c => c.id === editingClinic.id);
                if (updated) {
                    setEditingClinic({
                        ...updated,
                        createdAt: new Date(updated.createdAt),
                        updatedAt: new Date(updated.updatedAt),
                    });
                }
            }
        },
    });

    // Map DB clinics to the UI format
    const allClinics: DBClinic[] = (dbClinics || []).map((cl) => ({
        id: cl.id,
        name: cl.name,
        cnpj: cl.cnpj,
        phone: cl.phone,
        email: cl.email,
        address: cl.address,
        city: cl.city,
        createdById: cl.createdById,
        createdAt: new Date(cl.createdAt),
        updatedAt: new Date(cl.updatedAt),
        psychologists: cl.psychologists || [],
    }));

    // Trigger update of editing state if database updates
    const activeEditingClinic = editingClinic
        ? allClinics.find((c) => c.id === editingClinic.id) || editingClinic
        : null;

    const handleSaveClinic = async (formData: ClinicFormValues) => {
        try {
            if (editingClinic) {
                await updateMutation.mutateAsync({
                    id: editingClinic.id,
                    ...formData,
                });
            } else {
                await createMutation.mutateAsync(formData);
            }
            setSheetOpen(false);
            setEditingClinic(null);
        } catch (error) {
            console.error("Erro ao salvar clínica:", error);
        }
    };

    const handleDeleteClinic = async (id: string, name: string) => {
        if (window.confirm(`Deseja realmente excluir a clínica "${name}"? Todos os vínculos serão apagados.`)) {
            try {
                await deleteMutation.mutateAsync({ id });
            } catch (error) {
                console.error("Erro ao excluir clínica:", error);
            }
        }
    };

    const handleLinkPsychologist = async (email: string) => {
        if (!editingClinic) return;
        await linkMutation.mutateAsync({
            clinicId: editingClinic.id,
            psychologistEmail: email,
        });
    };

    const handleUnlinkPsychologist = async (psychologistId: string) => {
        if (!editingClinic) return;
        await unlinkMutation.mutateAsync({
            clinicId: editingClinic.id,
            psychologistId,
        });
    };

    const columns: DataTableColumn<DBClinic>[] = [
        {
            header: "Clínica",
            className: "w-[25%]",
            render: (clinic) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-foreground text-sm block">
                        {clinic.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        {clinic.cnpj}
                    </span>
                </div>
            ),
        },
        {
            header: "Contato",
            className: "w-[25%]",
            render: (clinic) => (
                <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs md:text-sm">
                        <Mail className="size-3.5 shrink-0" />
                        {clinic.email}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Phone className="size-3.5 shrink-0" />
                        {clinic.phone}
                    </span>
                </div>
            ),
        },
        {
            header: "Localização",
            className: "w-[25%]",
            render: (clinic) => (
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0" />
                        {clinic.address}
                    </span>
                    <span className="font-medium text-foreground ml-5">{clinic.city}</span>
                </div>
            ),
        },
        {
            header: "Profissionais",
            className: "w-[17%]",
            render: (clinic) => (
                <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit">
                        <Users className="size-3.5 shrink-0" />
                        {clinic.psychologists.length} profissionais
                    </span>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                        {clinic.psychologists.map((p) => p.name).join(", ")}
                    </p>
                </div>
            ),
        },
        {
            header: "",
            className: "w-[8%] text-right",
            render: (clinic) => {
                const isOwner = clinic.createdById === session?.user?.id;
                if (!isOwner) return null;
                return (
                    <div className="flex justify-end items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingClinic(clinic);
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
                                handleDeleteClinic(clinic.id, clinic.name);
                            }}
                        >
                            <Trash2 className="size-3.5 transition-colors" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <>
            <AppHeader
                title="Clínicas"
                description="Gerencie os cadastros de suas clínicas de psicologia e seus respectivos profissionais."
                icon={Building2}
                actions={
                    <>
                        <Button
                            size="sm"
                            onClick={() => {
                                setEditingClinic(null);
                                setSheetOpen(true);
                            }}
                            className="gap-1.5"
                            id="btn-new-clinic"
                        >
                            <Plus className="size-4" />
                            Nova Clínica
                        </Button>
                        <AppSheet
                            open={isSheetOpen}
                            onOpenChange={(open) => {
                                setSheetOpen(open);
                                if (!open) setEditingClinic(null);
                            }}
                            title={activeEditingClinic ? "Editar Clínica" : "Nova Clínica"}
                        >
                            <NewClinicForm
                                key={activeEditingClinic ? activeEditingClinic.id : "new"}
                                onSave={handleSaveClinic}
                                onCancel={() => {
                                    setSheetOpen(false);
                                    setEditingClinic(null);
                                }}
                                initialData={
                                    activeEditingClinic
                                        ? {
                                              id: activeEditingClinic.id,
                                              name: activeEditingClinic.name,
                                              cnpj: activeEditingClinic.cnpj,
                                              phone: activeEditingClinic.phone,
                                              email: activeEditingClinic.email,
                                              address: activeEditingClinic.address,
                                              city: activeEditingClinic.city,
                                              psychologists: activeEditingClinic.psychologists,
                                          }
                                        : undefined
                                }
                                onLinkPsychologist={handleLinkPsychologist}
                                onUnlinkPsychologist={handleUnlinkPsychologist}
                            />
                        </AppSheet>
                    </>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <DataTable
                    data={allClinics}
                    columns={columns}
                    searchPlaceholder="Buscar por nome, CNPJ ou cidade..."
                    searchFilter={(clinic, query) => {
                        const term = query.toLowerCase();
                        return (
                            clinic.name.toLowerCase().includes(term) ||
                            clinic.cnpj.includes(term) ||
                            clinic.city.toLowerCase().includes(term)
                        );
                    }}
                    emptyState={{
                        title: "Nenhuma clínica encontrada",
                        description: "Você ainda não possui clínicas cadastradas. Cadastre uma nova clínica para começar.",
                        icon: Building2,
                    }}
                />
            </div>
        </>
    );
}
export default ClinicasPage;
