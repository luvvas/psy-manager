import { useRef, useState, useCallback, useEffect } from "react";

export type CallStatus = "idle" | "connecting" | "waiting" | "active" | "ended" | "error";

interface Options {
    sessionId: string;
    role: "psychologist" | "patient";
    joinToken: string;
    iceServers: RTCIceServer[];
}

// VITE_WS_URL can point directly to the API host (bypassing CloudFront) when CloudFront
// doesn't have a /ws/* behavior configured. Falls back to VITE_API_URL otherwise.
const WS_BASE =
    (import.meta.env.VITE_WS_URL as string | undefined) ??
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "http://localhost:3001";

function getWsUrl(sessionId: string): string {
    return `${WS_BASE.replace(/^http/, "ws")}/ws/signaling/${sessionId}`;
}

export function useWebRtcCall({ sessionId, role, joinToken, iceServers }: Options) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<CallStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const statusRef = useRef<CallStatus>("idle");
    // ICE candidates that arrive before setRemoteDescription is called are queued here
    // and flushed once the remote description is set.
    const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
    const remoteDescriptionSet = useRef(false);

    function updateStatus(s: CallStatus) {
        statusRef.current = s;
        setStatus(s);
    }

    const sendWs = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    const stopLocalTracks = useCallback(() => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
    }, []);

    const endCall = useCallback(() => {
        stopLocalTracks();
        pcRef.current?.close();
        pcRef.current = null;
        wsRef.current?.close();
        wsRef.current = null;
        setRemoteStream(null);
        updateStatus("ended");
    }, [stopLocalTracks]);

    const startCall = useCallback(async () => {
        if (statusRef.current !== "idle") return;
        updateStatus("connecting");
        setErrorMessage(undefined);
        iceCandidateQueue.current = [];
        remoteDescriptionSet.current = false;

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
            updateStatus("error");
            setErrorMessage("Não foi possível acessar câmera ou microfone. Verifique as permissões.");
            return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (e) => {
            if (e.streams?.[0]) setRemoteStream(e.streams[0]);
        };

        pc.onicecandidate = (e) => {
            if (e.candidate) sendWs({ type: "ice", candidate: e.candidate });
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected") updateStatus("active");
            // "disconnected" is transient — the browser retries for ~5s before moving to "failed".
            // Only "failed" and "closed" are truly terminal.
            if (["failed", "closed"].includes(pc.connectionState)) {
                stopLocalTracks();
                setRemoteStream(null);
                pcRef.current = null;
                updateStatus("ended");
            }
        };

        const ws = new WebSocket(getWsUrl(sessionId));
        wsRef.current = ws;

        ws.onopen = () => {
            if (role === "psychologist") {
                sendWs({ type: "join", role: "psychologist", wsAuthToken: joinToken });
            } else {
                sendWs({ type: "join", role: "patient", token: joinToken });
            }
            updateStatus("waiting");
        };

        ws.onmessage = async (e: MessageEvent) => {
            const msg = JSON.parse(e.data as string) as { type: string; [k: string]: unknown };

            if (msg.type === "ready" && role === "psychologist") {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendWs({ type: "offer", sdp: pc.localDescription });
            }

            if (msg.type === "offer" && role === "patient") {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit));
                remoteDescriptionSet.current = true;
                for (const c of iceCandidateQueue.current) {
                    await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => null);
                }
                iceCandidateQueue.current = [];
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendWs({ type: "answer", sdp: pc.localDescription });
            }

            if (msg.type === "answer") {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit));
                remoteDescriptionSet.current = true;
                for (const c of iceCandidateQueue.current) {
                    await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => null);
                }
                iceCandidateQueue.current = [];
            }

            if (msg.type === "ice") {
                const candidate = msg.candidate as RTCIceCandidateInit;
                if (remoteDescriptionSet.current) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => null);
                } else {
                    iceCandidateQueue.current.push(candidate);
                }
            }

            if (msg.type === "peer_left") {
                updateStatus("ended");
            }
        };

        ws.onerror = () => {
            stopLocalTracks();
            pcRef.current?.close();
            pcRef.current = null;
            setRemoteStream(null);
            wsRef.current = null;
            updateStatus("error");
            setErrorMessage("Erro de conexão com o servidor. Tente novamente.");
        };

        ws.onclose = () => {
            if (statusRef.current !== "ended" && statusRef.current !== "error") {
                updateStatus("ended");
            }
        };
    }, [sessionId, role, joinToken, iceServers, sendWs]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            pcRef.current?.close();
            wsRef.current?.close();
        };
    }, []);

    return { localStream, remoteStream, status, errorMessage, startCall, endCall };
}
