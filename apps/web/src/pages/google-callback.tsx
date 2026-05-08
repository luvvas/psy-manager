import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function GoogleCallbackPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const code = searchParams.get("code");
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

    useEffect(() => {
        if (code && !hasTriggered.current) {
            hasTriggered.current = true;
            connectMutation.mutate({ code });
        } else if (!code) {
            toast.error("Código de autorização inválido recebido.");
            navigate("/agendamento");
        }
    }, [code, navigate]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                <Loader2 className="size-10 animate-spin text-primary" />
                <h1 className="text-xl font-bold tracking-tight">Conectando sua Agenda...</h1>
                <p className="text-sm text-muted-foreground">
                    Aguarde enquanto autenticamos e integramos sua conta do Google com o Psy-Manager.
                </p>
            </div>
        </div>
    );
}
