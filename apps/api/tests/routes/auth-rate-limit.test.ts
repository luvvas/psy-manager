/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { registerAuthRateLimiters } from "../../src/lib/rate-limit";

function buildApp() {
    const app = new Hono();
    registerAuthRateLimiters(app);
    app.on(["POST", "GET"], "/api/auth/*", (c) => c.text("ok"));
    return app;
}

function post(app: Hono, path: string, ip: string) {
    return app.request(path, { method: "POST", headers: { "cf-connecting-ip": ip } });
}

async function statuses(app: Hono, path: string, ip: string, times: number) {
    const result: number[] = [];
    for (let i = 0; i < times; i++) result.push((await post(app, path, ip)).status);
    return result;
}

describe("rate limit das rotas de autenticação (issue #39)", () => {
    test("a 11ª tentativa de POST /api/auth/sign-in/email do mesmo IP retorna 429", async () => {
        const app = buildApp();
        const codes = await statuses(app, "/api/auth/sign-in/email", "203.0.113.1", 11);

        expect(codes.slice(0, 10)).toEqual(Array(10).fill(200));
        expect(codes[10]).toBe(429);
    });

    test("a 6ª chamada de POST /api/auth/request-password-reset do mesmo IP retorna 429", async () => {
        const app = buildApp();
        const codes = await statuses(app, "/api/auth/request-password-reset", "203.0.113.2", 6);

        expect(codes.slice(0, 5)).toEqual(Array(5).fill(200));
        expect(codes[5]).toBe(429);
    });

    test("forget-password e request-password-reset dividem o mesmo limite", async () => {
        const app = buildApp();
        const ip = "203.0.113.3";
        await statuses(app, "/api/auth/request-password-reset", ip, 3);
        await statuses(app, "/api/auth/forget-password", ip, 2);

        expect((await post(app, "/api/auth/forget-password", ip)).status).toBe(429);
    });

    test("o limite é por IP: outro cliente segue liberado", async () => {
        const app = buildApp();
        await statuses(app, "/api/auth/sign-in/email", "203.0.113.4", 11);

        expect((await post(app, "/api/auth/sign-in/email", "203.0.113.5")).status).toBe(200);
    });
});
