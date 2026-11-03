import { useEffect, useRef } from "react";
import { Navigate, useParams, useLocation, useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useWebRtcCall } from "./hooks/use-webrtc-call";
import { ConsultaRoom } from "./components/consulta-room";
import { Loader2, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEFAULT_ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function PsychologistPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const state = location.state as { wsAuthToken?: string; patientJoinUrl?: string } | null;
    const wsAuthToken = state?.wsAuthToken ?? "";
    const patientJoinUrl = state?.patientJoinUrl;

    const { data: session, isLoading, isError } = trpc.videoSession.get.useQuery(
        { id: sessionId! },
        { enabled: !!sessionId }
    );

    const endMutation = trpc.videoSession.end.useMutation();

    const iceServers = session?.iceServers ?? DEFAULT_ICE;

    const { localStream, remoteStream, status, errorMessage, startCall, endCall } = useWebRtcCall({
        sessionId: sessionId!,
        role: "psychologist",
        joinToken: wsAuthToken,
        iceServers,
    });

    const startedRef = useRef(false);

    useEffect(() => {
        if (session && wsAuthToken && !startedRef.current) {
            startedRef.current = true;
            startCall();
        }
    }, [session, wsAuthToken, startCall]);

    const handleEndCall = async () => {
        endCall();
        if (sessionId) {
            await endMutation.mutateAsync({ id: sessionId }).catch(() => null);
        }
        navigate("/agendamento");
    };

    if (!wsAuthToken) {
        return <Navigate to="/agendamento" replace />;
    }

    if (isLoading) {
        return (
            <div className="flex h-svh items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError || !session) {
        return (
            <div className="flex h-svh flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                    <VideoOff className="size-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <h1 className="text-lg font-semibold">Sessão não encontrada</h1>
                    <p className="text-sm text-muted-foreground">
                        A videochamada expirou ou não existe mais. Inicie uma nova pela agenda.
                    </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/agendamento")}>
                    Voltar à agenda
                </Button>
            </div>
        );
    }

    return (
        <ConsultaRoom
            localStream={localStream}
            remoteStream={remoteStream}
            status={status}
            errorMessage={errorMessage}
            patientJoinUrl={patientJoinUrl}
            onEndCall={handleEndCall}
        />
    );
}
