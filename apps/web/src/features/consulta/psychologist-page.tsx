import { useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useWebRtcCall } from "./hooks/use-webrtc-call";
import { ConsultaRoom } from "./components/consulta-room";
import { Loader2 } from "lucide-react";

const DEFAULT_ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function PsychologistPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const state = location.state as { wsAuthToken?: string; patientJoinUrl?: string } | null;
    const wsAuthToken = state?.wsAuthToken ?? "";
    const patientJoinUrl = state?.patientJoinUrl;

    const { data: session, isLoading } = trpc.videoSession.get.useQuery(
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
        if (!wsAuthToken) {
            navigate("/agendamento", { replace: true });
        }
    }, [wsAuthToken, navigate]);

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
        return (
            <div className="flex h-svh items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-svh items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
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
