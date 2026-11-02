import { randomBytes } from "crypto";

// OAuth "state" for the Google Calendar connection (audit F3). The old state
// was the user id, and the callback never checked it, so a victim could be
// tricked into linking the attacker's Google account. Now each authorization
// URL gets a random, single-use state bound to the user who requested it.
//
// In memory, like the WebSocket rooms: a restart only forces the user to click
// "connect" again. Move to a shared store before running multiple instances.

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

/** True only once, for the same user, before expiry. */
export function consumeOAuthState(state: string, userId: string): boolean {
    const entry = states.get(state);
    if (!entry) return false;
    states.delete(state);
    return entry.userId === userId && entry.expiresAt >= Date.now();
}
