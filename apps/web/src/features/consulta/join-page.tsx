import { useState } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useWebRtcCall } from "./hooks/use-webrtc-call";
import { ConsultaRoom } from "./components/consulta-room";
import { Button } from "@/components/ui/button";
import { Loader2, Video, AlertCircle } from "lucide-react";

const DEFAULT_ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function JoinPage() {
    const { token } = useParams<{ token: string }>();
    const [joined, setJoined] = useState(false);

    const { data, isLoading, error } = trpc.videoSession.validateToken.useQuery(
        { token: token! },
        { enabled: !!token, retry: false }
    );

    const iceServers = data?.iceServers ?? DEFAULT_ICE;

    const { localStream, remoteStream, status, errorMessage, startCall, endCall } = useWebRtcCall({
        sessionId: data?.sessionId ?? "",
        role: "patient",
        joinToken: token!,
        iceServers,
    });

    const handleJoin = () => {
        setJoined(true);
        startCall();
    };

    const handleLeave = () => {
        endCall();
        setJoined(false);
    };

    if (isLoading) {
        return (
            <div className="flex h-svh items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data) {
        const msg =
            (error as { message?: string })?.message ??
            "Este link é inválido ou expirou. Solicite um novo link ao seu psicólogo.";

        return (
            <div className="flex h-svh flex-col items-center justify-center gap-4 px-6 text-center">
                <AlertCircle className="size-12 text-destructive" />
                <h1 className="text-xl font-semibold">Link inválido</h1>
                <p className="text-muted-foreground max-w-sm">{msg}</p>
            </div>
        );
    }

    if (joined) {
        return (
            <ConsultaRoom
                localStream={localStream}
                remoteStream={remoteStream}
                status={status}
                errorMessage={errorMessage}
                onEndCall={handleLeave}
            />
        );
    }

    return (
        <div className="flex h-svh flex-col items-center justify-center gap-6 px-6 text-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <Video className="size-8 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold">Consulta online</h1>
                <p className="text-muted-foreground">
                    Você foi convidado para uma consulta com{" "}
                    <span className="font-medium text-foreground">{data.psychologistName}</span>.
                </p>
            </div>

            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <p>Ao entrar, sua câmera e microfone serão ativados.</p>
                <p>Certifique-se de estar em um ambiente tranquilo e bem iluminado.</p>
            </div>

            <Button size="lg" onClick={handleJoin} className="gap-2 px-8">
                <Video className="size-5" />
                Entrar na consulta
            </Button>
        </div>
    );
}
