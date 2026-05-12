import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import { NewClinicForm, type ClinicFormValues } from "./components/clinic-form";
import { ClinicsTable, type DBClinic } from "./components/clinics-table";
import { AppSheet } from "@/components/layout/app-sheet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function ClinicasPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingClinic, setEditingClinic] = useState<DBClinic | null>(null);

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
                <ClinicsTable
                    clinics={allClinics}
                    onEdit={(clinic) => {
                        setEditingClinic(clinic);
                        setSheetOpen(true);
                    }}
                    onDelete={handleDeleteClinic}
                />
            </div>
        </>
    );
}
export default ClinicasPage;
