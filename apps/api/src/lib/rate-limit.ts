import type { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";

export const getIp = (c: { req: { header: (name: string) => string | undefined } }) =>
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
    c.req.header("x-real-ip") ??
    "unknown";

export function registerAuthRateLimiters(app: Hono) {
    const signInRateLimiter = rateLimiter({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        keyGenerator: (c) => `sign-in:${getIp(c)}`,
        standardHeaders: "draft-6",
        message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    });

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
