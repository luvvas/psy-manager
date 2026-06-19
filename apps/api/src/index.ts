import "./load-env";
import "./instrument";

import * as Sentry from "@sentry/hono/node";
import { sentry } from "@sentry/hono/node";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trpcServer } from "@hono/trpc-server";
import { rateLimiter } from "hono-rate-limiter";
import { WebSocketServer } from "ws";
import { URL } from "url";
import { appRouter } from "./routes/router";
import { createContext } from "./trpc/context";
import { auth } from "./lib/auth";
import { patientProjections } from "./cqrs/patient/patient.projections";
import { appointmentProjections } from "./cqrs/appointment/appointment.projections";
import { storageService } from "./services/storage.service";
import { handleSignaling } from "./ws/signaling";
import { eventBus } from "./lib/cqrs";
import { db } from "./db";
import { appointment } from "./db/schema";
import { eq } from "drizzle-orm";

// Initialize CQRS Projections/Subscribers
patientProjections.init();
appointmentProjections.init();

const app = new Hono();

app.use(sentry(app));

if (process.env.NODE_ENV !== "production") app.use("*", logger());
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

app.use(
    "*",
    cors({
        origin: allowedOrigins,
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
        credentials: true,
    })
);

const getIp = (c: { req: { header: (name: string) => string | undefined } }) =>
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? c.req.header("x-real-ip") ?? "unknown";

const signInRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    keyGenerator: (c) => `sign-in:${getIp(c)}`,
    standardHeaders: "draft-6",
    message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
});

const forgotPasswordRateLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    keyGenerator: (c) => `forgot-password:${getIp(c)}`,
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

app.use("/api/auth/sign-in", signInRateLimiter);
app.use("/api/auth/forgot-password", forgotPasswordRateLimiter);
app.use("/api/auth/*", authRateLimiter);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
});

app.get("/api/health", (c) => {
    const deadLetters = eventBus.getDeadLetters();
    const healthy = deadLetters.length === 0;
    return c.json(
        { status: healthy ? "ok" : "degraded", deadLetterCount: deadLetters.length },
        healthy ? 200 : 503
    );
});

// Called by Lambda after sending the WhatsApp reminder — stamps reminderSentAt
app.post("/api/internal/reminder-callback", async (c) => {
    const secret = c.req.header("x-callback-secret");
    if (!secret || secret !== process.env.LAMBDA_CALLBACK_SECRET) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    const body = await c.req.json<{ appointmentId: string }>();
    if (!body?.appointmentId) {
        return c.json({ error: "Missing appointmentId" }, 400);
    }
    await db
        .update(appointment)
        .set({ reminderSentAt: new Date() })
        .where(eq(appointment.id, body.appointmentId));
    return c.json({ success: true });
});

app.put("/api/storage/local-upload/:token", (c) => {
    return storageService.saveLocalUpload(c.req.param("token"), c.req.raw);
});

app.get("/api/storage/local-download/:token", (c) => {
    return storageService.readLocalFile(c.req.param("token"));
});

app.use(
    "/trpc/*",
    trpcServer({
        router: appRouter,
        createContext: (_opts, c) =>
            createContext({ headers: c.req.raw.headers }),
        onError: ({ error, ctx }) => {
            if (error.code === "INTERNAL_SERVER_ERROR") {
                Sentry.withScope((scope) => {
                    if (ctx?.session) {
                        scope.setUser({ id: ctx.session.user.id });
                    }
                    Sentry.captureException(error.cause ?? error);
                });
            }
        },
    })
);

app.onError((err, c) => {
    Sentry.captureException(err);
    return c.json({ error: "Internal Server Error" }, 500);
});

const port = Number(process.env.API_PORT) || 3001;

console.log(`🚀 psy-manager API running on http://localhost:${port}`);
console.log(`📡 tRPC endpoint: http://localhost:${port}/trpc`);
console.log(`🔐 Auth endpoint: http://localhost:${port}/api/auth`);
console.log(`🎥 WS signaling: ws://localhost:${port}/ws/signaling/:sessionId`);

const server = serve({ fetch: app.fetch, port });

// WebSocket signaling server — handles /ws/signaling/:sessionId upgrades
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://localhost:${port}`);
    const match = url.pathname.match(/^\/ws\/signaling\/([^/]+)$/);
    if (match) {
        wss.handleUpgrade(request, socket, head, (ws) => {
            handleSignaling(ws, match[1]);
        });
    } else {
        socket.destroy();
    }
});
