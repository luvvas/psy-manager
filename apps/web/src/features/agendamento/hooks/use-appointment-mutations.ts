import { toast } from "sonner";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import type { AppointmentFormValues } from "../appointment-schema";
import { toAppointmentPayload } from "../mappers";

export function useAppointmentMutations() {
    const utils = trpc.useUtils();

    const createMutation = trpc.appointment.create.useMutation({
        onSuccess: () => {
            toast.success("Agendamento criado com sucesso!");
            utils.appointment.invalidate();
            utils.billing.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro ao criar: ${err.message}`);
        },
    });

    const updateMutation = trpc.appointment.update.useMutation({
        onSuccess: () => {
            toast.success("Agendamento atualizado com sucesso!");
            utils.appointment.invalidate();
            utils.billing.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar: ${err.message}`);
        },
    });

    const deleteMutation = trpc.appointment.delete.useMutation({
        onSuccess: () => {
            toast.success("Agendamento excluído com sucesso!");
            utils.appointment.invalidate();
            utils.billing.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro ao excluir: ${err.message}`);
        },
    });

    async function saveAppointment(values: AppointmentFormValues, editingId: string | null): Promise<void> {
        const payload = toAppointmentPayload(values);
        if (editingId) {
            await updateMutation.mutateAsync({ id: editingId, ...payload });
        } else {
            await createMutation.mutateAsync(payload);
        }
    }

    async function deleteAppointment(id: string): Promise<void> {
        await deleteMutation.mutateAsync({ id });
    }

    return { saveAppointment, deleteAppointment };
}

type GoogleSyncResult = RouterOutputs["appointment"]["syncGoogle"];

function syncSummary({ imported, updated }: GoogleSyncResult): string {
    const parts: string[] = [];
    if (imported > 0) parts.push(`${imported} ${imported === 1 ? "sessão importada" : "sessões importadas"}`);
    if (updated > 0) parts.push(`${updated} ${updated === 1 ? "sessão atualizada" : "sessões atualizadas"}`);
    return parts.length > 0 ? parts.join(" e ") : "nenhuma sessão nova";
}

export function useSyncGoogleCalendar(onPending: (result: GoogleSyncResult) => void) {
    const utils = trpc.useUtils();
    return trpc.appointment.syncGoogle.useMutation({
        onSuccess: (data) => {
            if (data.imported > 0 || data.updated > 0) {
                utils.appointment.invalidate();
                utils.billing.invalidate();
            }
            if (data.pending.length > 0) {
                onPending(data);
                return;
            }
            toast.success(`Google Agenda sincronizado: ${syncSummary(data)}.`);
        },
        onError: (err) => {
            toast.error(`Erro ao sincronizar: ${err.message}`);
        },
    });
}

export function useResolveGoogleEvents(onDone: (result: GoogleSyncResult) => void) {
    const utils = trpc.useUtils();
    return trpc.appointment.resolveGoogleEvents.useMutation({
        onSuccess: (data) => {
            utils.appointment.invalidate();
            utils.billing.invalidate();
            utils.patient.invalidate();
            toast.success(`Google Agenda sincronizado: ${syncSummary(data)}.`);
            onDone(data);
        },
        onError: (err) => {
            toast.error(`Erro ao importar: ${err.message}`);
        },
    });
}

export function useDisconnectGoogle() {
    const utils = trpc.useUtils();
    return trpc.appointment.disconnectGoogle.useMutation({
        onSuccess: () => {
            utils.appointment.isConnectedGoogle.invalidate();
            toast.success("Agenda do Google desconectada.");
        },
        onError: (err) => {
            toast.error(`Erro ao desconectar: ${err.message}`);
        },
    });
}
