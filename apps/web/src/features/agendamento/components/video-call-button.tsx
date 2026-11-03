import { ExternalLink, Loader2, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { safeUrl } from "@/utils/safe-url";

interface VideoCallButtonProps {
    appointmentId: string;
    meetingUrl?: string | null;
    compact?: boolean;
}

export function VideoCallButton({ appointmentId, meetingUrl, compact = false }: VideoCallButtonProps) {
    const navigate = useNavigate();
    const createSession = trpc.videoSession.create.useMutation({
        onSuccess: (result) => {
            navigate(`/consulta/${result.sessionId}`, {
                state: { wsAuthToken: result.wsAuthToken, patientJoinUrl: result.patientJoinUrl },
            });
        },
        onError: () => toast.error("Não foi possível iniciar a videochamada."),
    });
    const safeMeetingUrl = safeUrl(meetingUrl);
    const iconClass = compact ? "size-3" : "size-4";
    const buttonClass = cn("w-full gap-1.5", compact && "h-7 text-xs");

    if (safeMeetingUrl) {
        return (
            <Button
                type="button"
                variant="outline"
                size={compact ? "sm" : "default"}
                className={buttonClass}
                onClick={(e) => {
                    e.stopPropagation();
                    window.open(safeMeetingUrl, "_blank", "noopener");
                }}
            >
                <ExternalLink className={iconClass} />
                Entrar na videochamada
            </Button>
        );
    }

    return (
        <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className={buttonClass}
            disabled={createSession.isPending}
            onClick={(e) => {
                e.stopPropagation();
                if (!window.confirm("Deseja iniciar a videochamada com este paciente?")) return;
                createSession.mutate({ appointmentId });
            }}
        >
            {createSession.isPending ? (
                <Loader2 className={cn(iconClass, "animate-spin")} />
            ) : (
                <Video className={iconClass} />
            )}
            Iniciar videochamada
        </Button>
    );
}
