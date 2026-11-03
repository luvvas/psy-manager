import { useEffect, useEffectEvent, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const INVALID_CODE_TOAST_ID = "google-callback-invalid-code";

export function GoogleCallbackPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const hasTriggered = useRef(false);

    const connectMutation = trpc.appointment.connectGoogleCalendar.useMutation({
        onSuccess: () => {
            toast.success("Agenda do Google conectada com sucesso!");
            navigate("/agendamento");
        },
        onError: (err) => {
            toast.error(`Falha ao conectar Agenda do Google: ${err.message}`);
            navigate("/agendamento");
        },
    });

    const connect = useEffectEvent((authCode: string, authState: string) => {
        connectMutation.mutate({ code: authCode, state: authState });
    });

    useEffect(() => {
        if (!code || !state) {
            toast.error("Código de autorização inválido recebido.", { id: INVALID_CODE_TOAST_ID });
            return;
        }
        if (hasTriggered.current) return;
        hasTriggered.current = true;
        connect(code, state);
    }, [code, state]);

    if (!code || !state) {
        return <Navigate to="/agendamento" replace />;
    }

    return (
        <div className="flex flex-1 flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                <Loader2 className="size-10 animate-spin text-primary" />
                <h1 className="text-xl font-bold tracking-tight">Conectando sua Agenda...</h1>
                <p className="text-sm text-muted-foreground">
                    Aguarde enquanto autenticamos e integramos sua conta do Google com o psy-manager.
                </p>
            </div>
        </div>
    );
}
