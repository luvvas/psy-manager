import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildChargeMessage, whatsAppUrl } from "./charge-message";

export interface SendChargeInput {
    patientName: string;
    telefone: string | null;
    openCount: number;
    total: number;
}

export function useSendCharge() {
    const { data: me } = trpc.psychologist.me.useQuery();

    return (input: SendChargeInput) => {
        const text = buildChargeMessage({
            patientName: input.patientName,
            openCount: input.openCount,
            total: input.total,
            psychologistName: me?.name ?? "",
            city: me?.city,
            pixKey: me?.pixKey,
        });
        const url = whatsAppUrl(input.telefone, text);
        if (!url) {
            toast.error("Cadastre o telefone do paciente para cobrar pelo WhatsApp.");
            return;
        }
        if (!me?.pixKey) toast.info("Cadastre sua chave Pix no perfil para enviar o Pix copia-e-cola junto.");
        window.open(url, "_blank", "noopener");
    };
}
