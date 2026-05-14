import "./load-env";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./routes/router";
import { createContext } from "./trpc/context";
import { auth } from "./lib/auth";
import { patientProjections } from "./cqrs/patient/patient.projections";
import { appointmentProjections } from "./cqrs/appointment/appointment.projections";
import { storageService } from "./services/storage.service";

// Initialize CQRS Projections/Subscribers
patientProjections.init();
appointmentProjections.init();

const app = new Hono();

app.use("*", logger());
app.use(
    "*",
    cors({
        origin: [
            "http://localhost:5173",
            "https://dswfc48bg9ft6.cloudfront.net",
        ],
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
        credentials: true,
    })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
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
    })
);

const port = Number(process.env.API_PORT) || 3001;

console.log(`🚀 psy-manager API running on http://localhost:${port}`);
console.log(`📡 tRPC endpoint: http://localhost:${port}/trpc`);
console.log(`🔐 Auth endpoint: http://localhost:${port}/api/auth`);

serve({
    fetch: app.fetch,
    port,
});
