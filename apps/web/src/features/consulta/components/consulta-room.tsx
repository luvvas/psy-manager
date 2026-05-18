import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ArrowLeftRight,
    ChevronUp,
    Copy,
    Loader2,
    Maximize2,
    Mic,
    MicOff,
    Minimize2,
    PhoneOff,
    UserX,
    Video,
    VideoOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CallStatus } from "../hooks/use-webrtc-call";

interface ConsultaRoomProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    status: CallStatus;
    errorMessage?: string;
    patientJoinUrl?: string;
    onEndCall: () => void;
    onSwitchAudioDevice?: (deviceId: string) => void;
    onSwitchVideoDevice?: (deviceId: string) => void;
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
    onSwitchAudioDevice,
    onSwitchVideoDevice,
}: ConsultaRoomProps) {
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [swapped, setSwapped] = useState(false);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = swapped ? localStream : remoteStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = swapped ? remoteStream : localStream;
    }, [remoteStream, localStream, swapped]);

    // Sync toggle state when stream is replaced
    useEffect(() => {
        if (!localStream) return;
        const audio = localStream.getAudioTracks()[0];
        if (audio) setMicEnabled(audio.enabled);
        const video = localStream.getVideoTracks()[0];
        if (video) setCameraEnabled(video.enabled);
    }, [localStream]);

    useEffect(() => {
        const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handleChange);
        return () => document.removeEventListener("fullscreenchange", handleChange);
    }, []);

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
            setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
            setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
        });
    }, []);

    const copyLink = useCallback(() => {
        if (!patientJoinUrl) return;
        navigator.clipboard.writeText(patientJoinUrl).then(() => {
            toast.success("Link copiado para a área de transferência");
        });
    }, [patientJoinUrl]);

    const toggleMic = useCallback(() => {
        if (!localStream) return;
        const track = localStream.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setMicEnabled(track.enabled);
        }
    }, [localStream]);

    const toggleCamera = useCallback(() => {
        if (!localStream) return;
        const track = localStream.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setCameraEnabled(track.enabled);
        }
    }, [localStream]);

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }, []);

    const showOverlay = status !== "active";
    const label = STATUS_LABELS[status];

    return (
        <div
            ref={containerRef}
            className="relative h-svh w-full bg-zinc-600 flex items-center justify-center overflow-hidden"
        >
            {/* Remote video — full background */}
            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={swapped}
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

            {/* Local video — PiP corner (click to swap) */}
            <div
                onClick={() => setSwapped((s) => !s)}
                className="absolute bottom-24 right-4 z-20 w-36 aspect-video rounded-xl overflow-hidden border border-zinc-700 shadow-xl bg-zinc-900 cursor-pointer group"
            >
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted={!swapped}
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowLeftRight className="size-5 text-white" />
                </div>
            </div>

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3">
                <span className="text-xs text-zinc-400 font-medium tracking-wide uppercase">
                    Consulta em andamento
                </span>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-3">
                {/* Mic toggle + device picker */}
                <div className="flex rounded-full overflow-hidden">
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={toggleMic}
                        className={`rounded-l-full rounded-r-none px-4 border-r border-zinc-600 ${micEnabled
                            ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                            : "bg-red-900/80 hover:bg-red-900 text-red-300"
                            }`}
                    >
                        {micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="lg"
                                className={`rounded-l-none rounded-r-full px-2 ${micEnabled
                                    ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                                    : "bg-red-900/80 hover:bg-red-900 text-red-300"
                                    }`}
                            >
                                <ChevronUp className="size-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="top"
                            className="bg-zinc-900 border-zinc-700 text-white min-w-52"
                        >
                            <DropdownMenuLabel className="text-zinc-400">Microfone</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-zinc-700" />
                            {audioDevices.length === 0 ? (
                                <DropdownMenuItem disabled className="text-zinc-500">
                                    Nenhum microfone encontrado
                                </DropdownMenuItem>
                            ) : (
                                audioDevices.map((device) => (
                                    <DropdownMenuItem
                                        key={device.deviceId}
                                        onClick={() => onSwitchAudioDevice?.(device.deviceId)}
                                        className="hover:bg-zinc-800 cursor-pointer"
                                    >
                                        {device.label || `Microfone ${device.deviceId.slice(0, 8)}`}
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Camera toggle + device picker */}
                <div className="flex rounded-full overflow-hidden">
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={toggleCamera}
                        className={`rounded-l-full rounded-r-none px-4 border-r border-zinc-600 ${cameraEnabled
                            ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                            : "bg-red-900/80 hover:bg-red-900 text-red-300"
                            }`}
                    >
                        {cameraEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="lg"
                                className={`rounded-l-none rounded-r-full px-2 ${cameraEnabled
                                    ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                                    : "bg-red-900/80 hover:bg-red-900 text-red-300"
                                    }`}
                            >
                                <ChevronUp className="size-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="top"
                            className="bg-zinc-900 border-zinc-700 text-white min-w-52"
                        >
                            <DropdownMenuLabel className="text-zinc-400">Câmera</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-zinc-700" />
                            {videoDevices.length === 0 ? (
                                <DropdownMenuItem disabled className="text-zinc-500">
                                    Nenhuma câmera encontrada
                                </DropdownMenuItem>
                            ) : (
                                videoDevices.map((device) => (
                                    <DropdownMenuItem
                                        key={device.deviceId}
                                        onClick={() => onSwitchVideoDevice?.(device.deviceId)}
                                        className="hover:bg-zinc-800 cursor-pointer"
                                    >
                                        {device.label || `Câmera ${device.deviceId.slice(0, 8)}`}
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Fullscreen toggle */}
                <Button
                    variant="secondary"
                    size="lg"
                    onClick={toggleFullscreen}
                    className="rounded-full px-4 bg-zinc-800 hover:bg-zinc-700 text-white"
                >
                    {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
                </Button>
                {/* End call */}
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
