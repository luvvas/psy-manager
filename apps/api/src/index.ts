import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, "../../../.env") });
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";

const app = new Hono();

// ============================================
// Middleware
// ============================================
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"], // Vite dev server
    credentials: true,
  })
);

// ============================================
// tRPC handler — all tRPC routes under /trpc/*
// ============================================
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: () => createContext(),
  })
);

// ============================================
// Non-tRPC routes (optional)
// ============================================
app.get("/", (c) => {
  return c.json({
    name: "psy-manager API",
    version: "0.0.1",
    trpc: "/trpc",
  });
});

// ============================================
// Start server
// ============================================
const port = Number(process.env.API_PORT) || 3001;

console.log(`🚀 psy-manager API running on http://localhost:${port}`);
console.log(`📡 tRPC endpoint: http://localhost:${port}/trpc`);

serve({
  fetch: app.fetch,
  port,
});
