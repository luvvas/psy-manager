import "./load-env";
import "./instrument";

import * as Sentry from "@sentry/hono/node";
import { sentry } from "@sentry/hono/node";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trpcServer } from "@hono/trpc-server";
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

app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
});

app.get("/api/health", (c) => {
    const deadLetters = eventBus.getDeadLetters();
    const healthy = deadLetters.length === 0;
    return c.json(
        { status: healthy ? "ok" : "degraded", deadLetters },
        healthy ? 200 : 503
    );
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
