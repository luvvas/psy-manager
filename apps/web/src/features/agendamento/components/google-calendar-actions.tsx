import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/format";
import { useSyncGoogleCalendar } from "../hooks/use-appointment-mutations";

export function GoogleCalendarActions() {
    const utils = trpc.useUtils();
    const { data: isConnectedGoogle } = trpc.appointment.isConnectedGoogle.useQuery();
    const syncGoogle = useSyncGoogleCalendar();
    const isSyncing = syncGoogle.isPending;
    const [isConnecting, setIsConnecting] = useState(false);

    async function connectGoogle() {
        setIsConnecting(true);
        try {
            const { url } = await utils.appointment.getGoogleAuthUrl.fetch();
            window.location.href = url;
        } catch (err) {
            logger.error("Erro ao conectar o Google Agenda", err);
            toast.error(`Erro ao conectar o Google Agenda: ${getErrorMessage(err)}`);
            setIsConnecting(false);
        }
    }

    if (isConnectedGoogle) {
        return (
            <Button
                size="sm"
                variant="outline"
                onClick={() => syncGoogle.mutate()}
                disabled={isSyncing}
                className="gap-1.5"
                id="btn-sync-google"
            >
                <RefreshCw className={cn("size-4", isSyncing && "animate-spin")} />
                {isSyncing ? "Sincronizando..." : "Sincronizar Agenda"}
            </Button>
        );
    }

    if (isConnectedGoogle === false) {
        return (
            <Button
                size="sm"
                variant="outline"
                onClick={connectGoogle}
                disabled={isConnecting}
                className="gap-1.5"
                id="btn-connect-google"
            >
                <RefreshCw className={cn("size-4", isConnecting && "animate-spin")} />
                Conectar Agenda do Google
            </Button>
        );
    }

    return null;
}
