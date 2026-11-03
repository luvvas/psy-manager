// MODELO — tela de listagem com cadastro em sheet.
// Exemplo fictício: feature "convenios", entidade HealthPlan, router trpc.healthPlan.
// Copie para apps/web/src/features/<feature>/page.tsx e troque nomes/campos.
import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSheet } from "@/components/layout/app-sheet";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { Plus, ShieldCheck } from "lucide-react";
import { HealthPlanForm, type HealthPlanFormValues } from "./components/health-plan-form";
import { HealthPlansTable, type HealthPlan } from "./components/health-plans-table";

export function ConveniosPage() {
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editing, setEditing] = useState<HealthPlan | null>(null);

    // Sem `retry: false`: a política de retry é global (lib/query-client.ts).
    const { data, isPending } = trpc.healthPlan.list.useQuery();
    const utils = trpc.useUtils();

    const createMutation = trpc.healthPlan.create.useMutation({
        onSuccess: () => {
            toast.success("Convênio cadastrado com sucesso!");
            // Invalida o router inteiro (lista, detalhe, contadores); acrescente aqui
            // outros routers que mostram este dado (ex.: utils.patient.invalidate()).
            utils.healthPlan.invalidate();
        },
        onError: (err) => toast.error(`Erro ao cadastrar: ${err.message}`),
    });

    const updateMutation = trpc.healthPlan.update.useMutation({
        onSuccess: () => {
            toast.success("Convênio atualizado com sucesso!");
            utils.healthPlan.invalidate();
        },
        onError: (err) => toast.error(`Erro ao atualizar: ${err.message}`),
    });

    const deleteMutation = trpc.healthPlan.delete.useMutation({
        onSuccess: () => {
            toast.success("Convênio excluído com sucesso!");
            utils.healthPlan.invalidate();
        },
        onError: (err) => toast.error(`Erro ao excluir: ${err.message}`),
    });

    const openNew = () => {
        setEditing(null);
        setSheetOpen(true);
    };

    const closeSheet = () => {
        setSheetOpen(false);
        setEditing(null);
    };

    const handleSave = async (values: HealthPlanFormValues) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing.id, ...values });
            } else {
                await createMutation.mutateAsync(values);
            }
            closeSheet();
        } catch (error) {
            logger.error("Erro ao salvar convênio", error);
        }
    };

    const handleDelete = (id: string, nome: string) => {
        if (window.confirm(`Deseja realmente excluir o convênio "${nome}"?`)) {
            deleteMutation.mutate({ id });
        }
    };

    return (
        <>
            <AppHeader
                title="Convênios"
                description="Gerencie os convênios aceitos no consultório."
                icon={ShieldCheck}
                actions={
                    <div className="flex items-center gap-2">
                        {/* Ações secundárias aqui: variant="outline" size="sm" */}
                        <Button size="sm" className="gap-1.5" onClick={openNew} id="btn-new-health-plan">
                            <Plus className="size-4" />
                            Novo Convênio
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                {/* <StatsCards ... /> quando a tela tiver KPIs */}
                <HealthPlansTable
                    healthPlans={data ?? []}
                    isLoading={isPending}
                    onEdit={(row) => {
                        setEditing(row);
                        setSheetOpen(true);
                    }}
                    onDelete={handleDelete}
                />
            </div>

            <AppSheet
                open={isSheetOpen}
                onOpenChange={(open) => (open ? setSheetOpen(true) : closeSheet())}
                title={editing ? "Editar Convênio" : "Novo Convênio"}
            >
                <HealthPlanForm
                    key={editing ? editing.id : "new"}
                    onSave={handleSave}
                    onCancel={closeSheet}
                    // Sempre o registro completo da API: o form envia todos os campos no
                    // update, e campo que não viesse aqui seria apagado.
                    initialData={editing ?? undefined}
                />
            </AppSheet>
        </>
    );
}
