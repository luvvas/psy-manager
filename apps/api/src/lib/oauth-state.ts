import { randomBytes } from "crypto";

const TTL_MS = 10 * 60 * 1000;
const states = new Map<string, { userId: string; expiresAt: number }>();

function prune(now: number) {
    for (const [state, entry] of states) {
        if (entry.expiresAt < now) states.delete(state);
    }
}

export function issueOAuthState(userId: string): string {
    const now = Date.now();
    prune(now);
    const state = randomBytes(32).toString("base64url");
    states.set(state, { userId, expiresAt: now + TTL_MS });
    return state;
}

export function consumeOAuthState(state: string, userId: string): boolean {
    const entry = states.get(state);
    if (!entry) return false;
    states.delete(state);
    return entry.userId === userId && entry.expiresAt >= Date.now();
}
