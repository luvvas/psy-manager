import type { WebSocket } from "ws";
import { createHash } from "crypto";
import { db } from "../db";
import { videoSession } from "../db/schema";
import { eq } from "drizzle-orm";
import { consumeAuthToken, getOrCreateRoom, getRoom, pruneRoom } from "./rooms";

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

type JoinPsychologist = { type: "join"; role: "psychologist"; wsAuthToken: string };
type JoinPatient = { type: "join"; role: "patient"; token: string };
type RelayMsg = { type: "offer" | "answer" | "ice"; [key: string]: unknown };
type InboundMsg = JoinPsychologist | JoinPatient | RelayMsg;

function send(ws: WebSocket, data: object): void {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

export function handleSignaling(ws: WebSocket, sessionId: string): void {
    ws.on("message", async (raw) => {
        let msg: InboundMsg;
        try {
            msg = JSON.parse(raw.toString()) as InboundMsg;
        } catch {
            ws.close(1003, "Invalid JSON");
            return;
        }

        if (msg.type === "join") {
            if (msg.role === "psychologist") {
                if (!consumeAuthToken(sessionId, msg.wsAuthToken)) {
                    ws.close(1008, "Unauthorized");
                    return;
                }
                const room = getOrCreateRoom(sessionId);
                if (room.psychologist) {
                    ws.close(1008, "Role already occupied");
                    return;
                }
                room.psychologist = ws;
                if (room.patient) {
                    send(ws, { type: "ready" });
                    send(room.patient, { type: "ready" });
                }
                return;
            }

            if (msg.role === "patient") {
                const [s] = await db
                    .select()
                    .from(videoSession)
                    .where(eq(videoSession.id, sessionId));

                const now = new Date();
                if (
                    !s ||
                    s.patientToken !== hashToken(msg.token) ||
                    s.status === "ended" ||
                    now > new Date(s.expiresAt)
                ) {
                    ws.close(1008, "Unauthorized");
                    return;
                }

                const room = getOrCreateRoom(sessionId);
                if (room.patient) {
                    ws.close(1008, "Role already occupied");
                    return;
                }
                room.patient = ws;
                if (room.psychologist) {
                    send(room.psychologist, { type: "ready" });
                    send(ws, { type: "ready" });
                }
                return;
            }
        }

        // Relay offer / answer / ice to the other peer
        const room = getRoom(sessionId);
        if (!room) return;

        const isPsychologist = room.psychologist === ws;
        const isPatient = room.patient === ws;
        const peer = isPsychologist ? room.patient : isPatient ? room.psychologist : undefined;
        if (!peer) return;

        if (msg.type === "offer" || msg.type === "answer" || msg.type === "ice") {
            send(peer, msg);
        }
    });

    ws.on("close", () => {
        const room = getRoom(sessionId);
        if (!room) return;

        let peer: WebSocket | undefined;
        if (room.psychologist === ws) {
            room.psychologist = undefined;
            peer = room.patient;
        } else if (room.patient === ws) {
            room.patient = undefined;
            peer = room.psychologist;
        }

        if (peer) {
            send(peer, { type: "peer_left" });
        }

        pruneRoom(sessionId);
    });
}
