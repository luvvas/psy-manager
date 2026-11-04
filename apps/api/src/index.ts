import "./load-env";
import "./check-env";
import "./instrument";

import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { URL } from "url";
import { createApp } from "./app";
import { handleSignaling } from "./ws/signaling";

const app = createApp();

const port = Number(process.env.API_PORT) || 3001;

console.log(`🚀 psy-manager API running on http://localhost:${port}`);
console.log(`📡 tRPC endpoint: http://localhost:${port}/trpc`);
console.log(`🔐 Auth endpoint: http://localhost:${port}/api/auth`);
console.log(`🎥 WS signaling: ws://localhost:${port}/ws/signaling/:sessionId`);

const server = serve({ fetch: app.fetch, port });

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
