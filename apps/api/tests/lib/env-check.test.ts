/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { randomBytes } from "crypto";
import { createHash } from "crypto";
import { COMPROMISED_SECRET_SHA256, checkServerEnv } from "../../src/lib/env-check";

const KEY = randomBytes(32).toString("base64");
const AUTH_SECRET = randomBytes(32).toString("base64");

function validEnv(overrides: Record<string, string | undefined> = {}) {
    return {
        DATABASE_URL: "postgresql://postgres:s3nh4-f0rte@db:5432/psy_manager",
        ENCRYPTION_KEY: KEY,
        BETTER_AUTH_SECRET: AUTH_SECRET,
        GOOGLE_CLIENT_ID: "123.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "real-client-secret",
        ...overrides,
    };
}

describe("checkServerEnv (issue #40)", () => {
    test("ambiente válido passa, em dev e em produção", () => {
        expect(checkServerEnv(validEnv())).toEqual([]);
        expect(checkServerEnv(validEnv({ NODE_ENV: "production" }))).toEqual([]);
    });

    test("recusa ENCRYPTION_KEY ausente, inválida ou de tamanho errado", () => {
        expect(checkServerEnv(validEnv({ ENCRYPTION_KEY: undefined }))).toEqual(["ENCRYPTION_KEY não definida."]);
        for (const bad of [randomBytes(16).toString("base64"), randomBytes(48).toString("base64"), "não-é-base64"]) {
            expect(checkServerEnv(validEnv({ ENCRYPTION_KEY: bad }))).toEqual([
                "ENCRYPTION_KEY deve ter 32 bytes depois de decodificada de base64.",
            ]);
        }
    });

    test("recusa DATABASE_URL e BETTER_AUTH_SECRET ausentes ou fracos", () => {
        const errors = checkServerEnv(validEnv({ DATABASE_URL: undefined, BETTER_AUTH_SECRET: "curto" }));
        expect(errors).toContain("DATABASE_URL não definida.");
        expect(errors).toContain("BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres.");
    });

    test("em produção recusa segredos com valor padrão conhecido", () => {
        const errors = checkServerEnv(
            validEnv({
                NODE_ENV: "production",
                DATABASE_URL: "postgresql://postgres:postgres@db:5432/psy_manager",
                GOOGLE_CLIENT_SECRET: "your-google-client-secret",
            })
        );
        expect(errors).toHaveLength(2);
        expect(errors.join(" ")).toContain("senha da DATABASE_URL");
        expect(errors.join(" ")).toContain("GOOGLE_CLIENT_SECRET");
        // Defaults são aceitos fora de produção (dev local).
        expect(
            checkServerEnv(validEnv({ DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/psy_manager" }))
        ).toEqual([]);
    });

    test("mensagens nomeiam a variável sem imprimir o valor", () => {
        const secret = "your-google-client-secret";
        const leakyKey = "dGhpcy1pcy1ub3QtMzItYnl0ZXM=";
        const errors = checkServerEnv(
            validEnv({ NODE_ENV: "production", GOOGLE_CLIENT_SECRET: secret, ENCRYPTION_KEY: leakyKey })
        );
        for (const error of errors) {
            expect(error).not.toContain(secret);
            expect(error).not.toContain(leakyKey);
        }
    });

    test("recusa BETTER_AUTH_SECRET que já foi publicado, em qualquer ambiente (auditoria F2)", () => {
        // O valor real não é repetido aqui: simulamos um segredo vazado pelo hash.
        const leaked = randomBytes(32).toString("base64");
        const hash = createHash("sha256").update(leaked).digest("hex");
        COMPROMISED_SECRET_SHA256.add(hash);
        try {
            const expected = ["BETTER_AUTH_SECRET é um valor que já foi publicado; gere um novo (openssl rand -base64 32)."];
            expect(checkServerEnv(validEnv({ BETTER_AUTH_SECRET: leaked }))).toEqual(expected);
            expect(checkServerEnv(validEnv({ BETTER_AUTH_SECRET: leaked, NODE_ENV: "production" }))).toEqual(expected);
        } finally {
            COMPROMISED_SECRET_SHA256.delete(hash);
        }
    });
});
