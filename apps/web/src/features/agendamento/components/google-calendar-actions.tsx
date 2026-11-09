import { useRef, useState } from "react";
import { ChevronDown, ListChecks, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logger } from "@/lib/logger";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/format";
import { useDisconnectGoogle, useSyncGoogleCalendar } from "../hooks/use-appointment-mutations";
import { GoogleReviewSheet } from "./google-review-sheet";

type Review = { id: number; pending: RouterOutputs["appointment"]["syncGoogle"]["pending"] };

export function GoogleCalendarActions() {
    const utils = trpc.useUtils();
    const { data: isConnectedGoogle } = trpc.appointment.isConnectedGoogle.useQuery();
    const [review, setReview] = useState<Review | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const syncGoogle = useSyncGoogleCalendar((result) => {
        setReview({ id: Date.now(), pending: result.pending });
        setReviewOpen(true);
    });

    function handleResolved(result: RouterOutputs["appointment"]["syncGoogle"]) {
        setReviewOpen(false);
        setReview(result.pending.length > 0 ? { id: Date.now(), pending: result.pending } : null);
    }
    const disconnectGoogle = useDisconnectGoogle();
    const isSyncing = syncGoogle.isPending;
    const [isConnecting, setIsConnecting] = useState(false);
    const groupRef = useRef<HTMLDivElement>(null);
    const [menuWidth, setMenuWidth] = useState<number>();

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

    function disconnect() {
        if (window.confirm("Desconectar a Agenda do Google? As sessões já importadas continuam na agenda.")) {
            setReview(null);
            disconnectGoogle.mutate();
        }
    }

    if (isConnectedGoogle) {
        return (
            <>
                <div className="flex" ref={groupRef}>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncGoogle.mutate()}
                        disabled={isSyncing}
                        className="gap-1.5 rounded-r-none"
                        id="btn-sync-google"
                    >
                        <RefreshCw className={cn("size-4", isSyncing && "animate-spin")} />
                        {isSyncing ? "Sincronizando..." : "Sincronizar Agenda"}
                    </Button>
                    <DropdownMenu
                        onOpenChange={(open) => {
                            if (open) setMenuWidth(groupRef.current?.offsetWidth);
                        }}
                    >
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                className="rounded-l-none border-l-0 px-2"
                                aria-label="Mais opções do Google Agenda"
                                id="btn-google-menu"
                            >
                                <ChevronDown className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-0" style={{ width: menuWidth }}>
                            {review && review.pending.length > 0 && (
                                <DropdownMenuItem onSelect={() => setReviewOpen(true)}>
                                    <ListChecks />
                                    Revisar eventos pendentes
                                </DropdownMenuItem>
                            )}
                            {review && review.pending.length > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={disconnect}
                                disabled={disconnectGoogle.isPending}
                            >
                                <Unplug />
                                Desconectar Google Agenda
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {review && (
                    <GoogleReviewSheet
                        key={review.id}
                        pending={review.pending}
                        open={reviewOpen}
                        onOpenChange={setReviewOpen}
                        onResolved={handleResolved}
                    />
                )}
            </>
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
