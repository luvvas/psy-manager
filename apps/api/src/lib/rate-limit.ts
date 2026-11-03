import type { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";

// In production the origin is reachable only through Cloudflare Tunnel, so
// cf-connecting-ip is set by Cloudflare and cannot be spoofed by the client.
export const getIp = (c: { req: { header: (name: string) => string | undefined } }) =>
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
    c.req.header("x-real-ip") ??
    "unknown";

// Paths must match the routes better-auth actually exposes: app.use() without a
// wildcard matches the exact path only, so the old "/api/auth/sign-in" and
// "/api/auth/forgot-password" registrations never ran (issue #39).
//
// The store is in memory: counters reset on restart and are not shared between
// API instances (production runs a single one). Cloudflare's rate
// limiting rule on /api/auth/sign-in is the edge-side layer.
export function registerAuthRateLimiters(app: Hono) {
    const signInRateLimiter = rateLimiter({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        keyGenerator: (c) => `sign-in:${getIp(c)}`,
        standardHeaders: "draft-6",
        message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    });

    // One shared counter for both reset endpoints, so alternating between them
    // does not double the budget.
    const passwordResetRateLimiter = rateLimiter({
        windowMs: 60 * 60 * 1000,
        limit: 5,
        keyGenerator: (c) => `password-reset:${getIp(c)}`,
        standardHeaders: "draft-6",
        message: "Muitas solicitações de recuperação de senha. Tente novamente em 1 hora.",
    });

    const authRateLimiter = rateLimiter({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        keyGenerator: (c) => `auth:${getIp(c)}`,
        standardHeaders: "draft-6",
        message: "Muitas requisições. Tente novamente em instantes.",
    });

    app.use("/api/auth/sign-in/*", signInRateLimiter);
    app.use("/api/auth/request-password-reset", passwordResetRateLimiter);
    app.use("/api/auth/forget-password", passwordResetRateLimiter);
    app.use("/api/auth/*", authRateLimiter);
}
