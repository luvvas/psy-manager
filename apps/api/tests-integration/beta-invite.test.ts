/// <reference types="bun" />

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { betaInviteService } from "../src/services/beta-invite.service";
import { PASSWORD, authRequest, uniqueEmail } from "./setup/helpers";

function signUpBody(email: string) {
    return { name: "Convidada Beta", email, password: PASSWORD };
}

describe("cadastro só para convidados do beta", () => {
    beforeEach(() => {
        process.env.BETA_INVITE_ONLY = "true";
    });

    afterEach(() => {
        delete process.env.BETA_INVITE_ONLY;
    });

    it("recusa e-mail fora da lista com mensagem em português e não cria a conta", async () => {
        const email = uniqueEmail("fora");
        const response = await authRequest("/api/auth/sign-up/email", signUpBody(email));
        expect(response.status).toBe(403);
        const body = (await response.json()) as { code?: string; message?: string };
        expect(body.code).toBe("BETA_INVITE_REQUIRED");
        expect(body.message).toContain("convidados do beta");

        const login = await authRequest("/api/auth/sign-in/email", { email, password: PASSWORD });
        expect(login.status).toBe(401);
    });

    it("aceita e-mail convidado, sem diferenciar maiúsculas e espaços", async () => {
        const email = uniqueEmail("convidada");
        expect(await betaInviteService.add([`  ${email.toUpperCase()} `])).toEqual([email]);
        const response = await authRequest("/api/auth/sign-up/email", signUpBody(email));
        expect(response.status).toBe(200);
    });

    it("convite removido volta a bloquear", async () => {
        const email = uniqueEmail("removida");
        await betaInviteService.add([email]);
        expect(await betaInviteService.remove([email])).toEqual([email]);
        const response = await authRequest("/api/auth/sign-up/email", signUpBody(email));
        expect(response.status).toBe(403);
    });

    it("convidar de novo não duplica", async () => {
        const email = uniqueEmail("repetida");
        expect(await betaInviteService.add([email, email])).toEqual([email]);
        expect(await betaInviteService.add([email])).toEqual([]);
    });

    it("quem já tem conta continua entrando com a lista ligada", async () => {
        delete process.env.BETA_INVITE_ONLY;
        const email = uniqueEmail("antiga");
        expect((await authRequest("/api/auth/sign-up/email", signUpBody(email))).status).toBe(200);
        process.env.BETA_INVITE_ONLY = "true";
        const login = await authRequest("/api/auth/sign-in/email", { email, password: PASSWORD });
        expect(login.status).toBe(200);
    });
});

describe("cadastro aberto quando a lista está desligada", () => {
    it("aceita qualquer e-mail sem BETA_INVITE_ONLY", async () => {
        const response = await authRequest("/api/auth/sign-up/email", signUpBody(uniqueEmail("aberta")));
        expect(response.status).toBe(200);
    });
});
