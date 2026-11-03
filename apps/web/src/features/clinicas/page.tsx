import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Building2, Check, Plus, X } from "lucide-react";
import { NewClinicForm, type ClinicFormValues } from "./components/clinic-form";
import { ClinicsTable, type Clinic } from "./components/clinics-table";
import { AppSheet } from "@/components/layout/app-sheet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export function ClinicasPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);

    const { data: dbClinics, isPending } = trpc.clinic.list.useQuery();
    const utils = trpc.useUtils();
    const invalidateClinicData = () => {
        utils.clinic.invalidate();
        utils.appointment.invalidate();
    };

    const { data: invites } = trpc.clinic.listInvites.useQuery();

    const acceptInviteMutation = trpc.clinic.acceptInvite.useMutation({
        onSuccess: () => {
            toast.success("Convite aceito. A clínica foi adicionada à sua lista.");
            invalidateClinicData();
        },
        onError: (err) => toast.error(err.message),
    });

    const declineInviteMutation = trpc.clinic.declineInvite.useMutation({
        onSuccess: () => {
            toast.success("Convite recusado.");
            invalidateClinicData();
        },
        onError: (err) => toast.error(err.message),
    });

    const leaveMutation = trpc.clinic.leave.useMutation({
        onSuccess: () => {
            toast.success("Você saiu da clínica.");
            invalidateClinicData();
        },
        onError: (err) => toast.error(err.message),
    });

    const createMutation = trpc.clinic.create.useMutation({
        onSuccess: () => {
            toast.success("Clínica cadastrada com sucesso!");
            invalidateClinicData();
        },
        onError: (err) => {
            toast.error(`Erro ao cadastrar clínica: ${err.message}`);
        },
    });

    const updateMutation = trpc.clinic.update.useMutation({
        onSuccess: () => {
            toast.success("Clínica atualizada com sucesso!");
            invalidateClinicData();
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar clínica: ${err.message}`);
        },
    });

    const deleteMutation = trpc.clinic.delete.useMutation({
        onSuccess: () => {
            toast.success("Clínica excluída com sucesso!");
            invalidateClinicData();
        },
        onError: (err) => {
            toast.error(`Erro ao excluir clínica: ${err.message}`);
        },
    });

    const linkMutation = trpc.clinic.linkPsychologist.useMutation({
        onSuccess: () => {
            invalidateClinicData();
        },
    });

    const unlinkMutation = trpc.clinic.unlinkPsychologist.useMutation({
        onSuccess: () => {
            invalidateClinicData();
        },
    });

    const clinics = dbClinics ?? [];
    const pendingInvites = invites ?? [];
    const activeEditingClinic = editingClinic
        ? clinics.find((c) => c.id === editingClinic.id) ?? editingClinic
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
            logger.error("Erro ao salvar clínica", error);
        }
    };

    const handleDeleteClinic = async (id: string, name: string) => {
        if (window.confirm(`Deseja realmente excluir a clínica "${name}"? Todos os vínculos serão apagados.`)) {
            try {
                await deleteMutation.mutateAsync({ id });
            } catch (error) {
                logger.error("Erro ao excluir clínica", error);
            }
        }
    };

    const handleLeaveClinic = (id: string, name: string) => {
        if (window.confirm(`Sair da clínica "${name}"? Você deixa de ver as sessões marcadas nas salas dela e não pode mais reservar salas. As sessões que você já marcou nas salas continuam reservadas.`)) {
            leaveMutation.mutate({ clinicId: id });
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
                    <div className="flex items-center gap-2">
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
                    </div>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {pendingInvites.length > 0 && (
                    <div className="rounded-lg border bg-muted/30 divide-y">
                        {pendingInvites.map((invite) => (
                            <div key={invite.clinicId} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                                <div>
                                    <p className="font-medium">Convite para a clínica {invite.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {invite.city}. Ao aceitar, você pode reservar as salas da clínica. As sessões marcadas nas salas aparecem para os membros (só horário e psicóloga, sem dados de pacientes).
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="gap-1.5"
                                        disabled={acceptInviteMutation.isPending}
                                        onClick={() => acceptInviteMutation.mutate({ clinicId: invite.clinicId })}
                                    >
                                        <Check className="size-4" /> Aceitar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        disabled={declineInviteMutation.isPending}
                                        onClick={() => declineInviteMutation.mutate({ clinicId: invite.clinicId })}
                                    >
                                        <X className="size-4" /> Recusar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <ClinicsTable
                    clinics={clinics}
                    isLoading={isPending}
                    onEdit={(clinic) => {
                        setEditingClinic(clinic);
                        setSheetOpen(true);
                    }}
                    onDelete={handleDeleteClinic}
                    onLeave={handleLeaveClinic}
                />
            </div>

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
                    initialData={activeEditingClinic ?? undefined}
                    onLinkPsychologist={handleLinkPsychologist}
                    onUnlinkPsychologist={handleUnlinkPsychologist}
                />
            </AppSheet>
        </>
    );
}
export default ClinicasPage;
