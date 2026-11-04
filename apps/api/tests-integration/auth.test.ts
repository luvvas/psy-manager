/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import {
    PASSWORD,
    anonymousCaller,
    authRequest,
    callerForCookie,
    cookieFrom,
    expectTrpcError,
    signUp,
    uniqueEmail,
    uniqueIp,
} from "./setup/helpers";

describe("auth real (Better Auth + Postgres)", () => {
    it("cadastro cria sessão e me devolve a própria psicóloga", async () => {
        const ana = await signUp("Ana Cadastro");
        const me = await ana.caller.psychologist.me();
        expect(me?.id).toBe(ana.id);
        expect(me?.email).toBe(ana.email);
        expect(me?.crp).toBe("06/123456");
    });

    it("login com senha certa abre sessão e com senha errada não", async () => {
        const ana = await signUp();
        const ok = await authRequest("/api/auth/sign-in/email", { email: ana.email, password: PASSWORD });
        expect(ok.status).toBe(200);
        const caller = await callerForCookie(cookieFrom(ok));
        expect((await caller.psychologist.me())?.id).toBe(ana.id);

        const wrong = await authRequest("/api/auth/sign-in/email", { email: ana.email, password: "errada-123456" });
        expect(wrong.status).toBe(401);
    });

    it("e-mail duplicado não cria segunda conta", async () => {
        const email = uniqueEmail();
        const body = { name: "Dup", email, password: PASSWORD };
        expect((await authRequest("/api/auth/sign-up/email", body)).status).toBe(200);
        expect((await authRequest("/api/auth/sign-up/email", body)).status).not.toBe(200);
    });

    it("procedure protegida sem sessão responde UNAUTHORIZED", async () => {
        const anon = await anonymousCaller();
        await expectTrpcError(anon.patient.list(), "UNAUTHORIZED");
        await expectTrpcError(anon.psychologist.me(), "UNAUTHORIZED");
    });

    it("cookie inválido não autentica", async () => {
        const caller = await callerForCookie("better-auth.session_token=forjado.assinatura");
        await expectTrpcError(caller.patient.list(), "UNAUTHORIZED");
    });

    it("sessão encerrada no sign-out deixa de valer", async () => {
        const ana = await signUp();
        const out = await authRequest("/api/auth/sign-out", {}, uniqueIp(), { cookie: ana.cookie });
        expect(out.status).toBe(200);
        const caller = await callerForCookie(ana.cookie);
        await expectTrpcError(caller.patient.list(), "UNAUTHORIZED");
    });
});

describe("rate limit das rotas de auth", () => {
    it("bloqueia o 11º sign-in do mesmo IP em 15 minutos", async () => {
        const ip = uniqueIp();
        const statuses: number[] = [];
        for (let i = 0; i < 11; i++) {
            const r = await authRequest("/api/auth/sign-in/email", { email: "ninguem@teste.dev", password: "x-123456789" }, ip);
            statuses.push(r.status);
        }
        expect(statuses.slice(0, 10).every((s) => s !== 429)).toBe(true);
        expect(statuses[10]).toBe(429);
    });

    it("o limite é por IP: outro IP continua passando", async () => {
        const ip = uniqueIp();
        for (let i = 0; i < 10; i++) {
            await authRequest("/api/auth/sign-in/email", { email: "ninguem@teste.dev", password: "x-123456789" }, ip);
        }
        const blocked = await authRequest("/api/auth/sign-in/email", { email: "ninguem@teste.dev", password: "x-123456789" }, ip);
        const other = await authRequest("/api/auth/sign-in/email", { email: "ninguem@teste.dev", password: "x-123456789" });
        expect(blocked.status).toBe(429);
        expect(other.status).not.toBe(429);
    });

    it("bloqueia a 6ª solicitação de redefinição de senha em 1 hora", async () => {
        const ip = uniqueIp();
        const statuses: number[] = [];
        for (let i = 0; i < 6; i++) {
            const r = await authRequest(
                "/api/auth/request-password-reset",
                { email: "ninguem@teste.dev", redirectTo: "http://localhost:5173/redefinir-senha" },
                ip
            );
            statuses.push(r.status);
        }
        expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
        expect(statuses[5]).toBe(429);
    });

    it("teto geral de 30 requisições em /api/auth/* por IP", async () => {
        const ip = uniqueIp();
        let last = 0;
        for (let i = 0; i < 31; i++) {
            const r = await authRequest("/api/auth/sign-up/email", { name: "X", email: uniqueEmail("rl"), password: PASSWORD }, ip);
            last = r.status;
        }
        expect(last).toBe(429);
    });
});

