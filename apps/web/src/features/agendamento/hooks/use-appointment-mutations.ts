import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { AppointmentFormValues } from "../appointment-schema";
import { toAppointmentPayload } from "../mappers";

export function useAppointmentMutations() {
    const utils = trpc.useUtils();

    const createMutation = trpc.appointment.create.useMutation({
        onSuccess: () => {
            toast.success("Agendamento criado com sucesso!");
            utils.appointment.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro ao criar: ${err.message}`);
        },
    });

    const updateMutation = trpc.appointment.update.useMutation({
        onSuccess: () => {
            toast.success("Agendamento atualizado com sucesso!");
            utils.appointment.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar: ${err.message}`);
        },
    });

    const deleteMutation = trpc.appointment.delete.useMutation({
        onSuccess: () => {
            toast.success("Agendamento excluído com sucesso!");
            utils.appointment.invalidate();
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

export function useSyncGoogleCalendar() {
    const utils = trpc.useUtils();
    return trpc.appointment.syncGoogle.useMutation({
        onSuccess: (data) => {
            toast.success(`Google Agenda sincronizado! Importados: ${data.imported}, Ignorados: ${data.skipped}`);
            utils.appointment.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro ao sincronizar: ${err.message}`);
        },
    });
}
