import { Button } from "@/components/ui/button";
import { Copy, Loader2, PhoneOff, UserX, Video } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CallStatus } from "../hooks/use-webrtc-call";

interface ConsultaRoomProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    status: CallStatus;
    errorMessage?: string;
    patientJoinUrl?: string;
    onEndCall: () => void;
}

const STATUS_LABELS: Partial<Record<CallStatus, string>> = {
    connecting: "Conectando...",
    waiting: "Aguardando conexão...",
    ended: "Chamada encerrada",
    error: "Erro na conexão",
};

export function ConsultaRoom({
    localStream,
    remoteStream,
    status,
    errorMessage,
    patientJoinUrl,
    onEndCall,
}: ConsultaRoomProps) {
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        return () => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        };
    }, [remoteStream]);

    useEffect(() => {
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
        return () => {
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
        };
    }, [localStream]);

    const copyLink = useCallback(() => {
        if (!patientJoinUrl) return;
        navigator.clipboard.writeText(patientJoinUrl).then(() => {
            toast.success("Link copiado para a área de transferência");
        });
    }, [patientJoinUrl]);

    const showOverlay = status !== "active";
    const label = STATUS_LABELS[status];

    return (
        <div className="relative h-svh w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
            {/* Remote video — full background */}
            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
            />

            {/* Overlay shown when not yet active */}
            {showOverlay && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950/80 z-10">
                    {status === "connecting" || status === "waiting" ? (
                        <>
                            <Loader2 className="size-10 text-white animate-spin" />
                            <p className="text-white text-lg font-medium">{label}</p>
                            {patientJoinUrl && status === "waiting" && (
                                <div className="flex flex-col items-center gap-2 mt-2">
                                    <p className="text-zinc-400 text-sm">Compartilhe o link com o paciente:</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={copyLink}
                                        className="gap-2 bg-transparent text-white border-zinc-600 hover:bg-zinc-800"
                                    >
                                        <Copy className="size-3.5" />
                                        Copiar link do paciente
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : status === "ended" ? (
                        <>
                            <UserX className="size-10 text-zinc-400" />
                            <p className="text-white text-lg font-medium">Chamada encerrada</p>
                        </>
                    ) : status === "error" ? (
                        <>
                            <Video className="size-10 text-red-400" />
                            <p className="text-white text-lg font-medium">{errorMessage ?? label}</p>
                        </>
                    ) : null}
                </div>
            )}

            {/* Local video — PiP corner */}
            <div className="absolute bottom-24 right-4 z-20 w-36 aspect-video rounded-xl overflow-hidden border border-zinc-700 shadow-xl bg-zinc-900">
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                />
            </div>

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3">
                <span className="text-xs text-zinc-400 font-medium tracking-wide uppercase">
                    Consulta em andamento
                </span>
                {patientJoinUrl && status === "active" && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyLink}
                        className="gap-2 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    >
                        <Copy className="size-3.5" />
                        Copiar link
                    </Button>
                )}
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center">
                <Button
                    variant="destructive"
                    size="lg"
                    onClick={onEndCall}
                    className="rounded-full gap-2 px-6"
                >
                    <PhoneOff className="size-5" />
                    Encerrar
                </Button>
            </div>
        </div>
    );
}
