import { randomBytes } from "crypto";
import type { WebSocket } from "ws";

interface Room {
    psychologist?: WebSocket;
    patient?: WebSocket;
    // token -> expiry timestamp
    pendingAuthTokens: Map<string, number>;
}

// In-memory room store. Single-instance only.
// For multi-instance deployments, replace with Redis pub/sub.
const rooms = new Map<string, Room>();

function getOrCreate(sessionId: string): Room {
    let room = rooms.get(sessionId);
    if (!room) {
        room = { pendingAuthTokens: new Map() };
        rooms.set(sessionId, room);
    }
    return room;
}

export function createAuthToken(sessionId: string): string {
    const token = randomBytes(16).toString("hex");
    const room = getOrCreate(sessionId);
    room.pendingAuthTokens.set(token, Date.now() + 10 * 60 * 1000); // 10 min TTL
    return token;
}

export function consumeAuthToken(sessionId: string, token: string): boolean {
    const room = rooms.get(sessionId);
    if (!room) return false;
    const expiry = room.pendingAuthTokens.get(token);
    if (!expiry || Date.now() > expiry) return false;
    room.pendingAuthTokens.delete(token);
    return true;
}

export function getRoom(sessionId: string): Room | undefined {
    return rooms.get(sessionId);
}

export function getOrCreateRoom(sessionId: string): Room {
    return getOrCreate(sessionId);
}

export function pruneRoom(sessionId: string): void {
    const room = rooms.get(sessionId);
    if (room && !room.psychologist && !room.patient && room.pendingAuthTokens.size === 0) {
        rooms.delete(sessionId);
    }
}
