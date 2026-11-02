/// <reference types="bun" />

import { describe, expect, spyOn, test } from "bun:test";
import { randomBytes } from "crypto";

process.env.ENCRYPTION_KEY ??= randomBytes(32).toString("base64");
const { decryptField, encryptField, getDecryptFailureCount } = await import("../../src/lib/encryption");

describe("decryptField (issue #40)", () => {
    test("texto legado não cifrado volta como está, sem contar falha", () => {
        const before = getDecryptFailureCount();
        expect(decryptField("Maria da Silva")).toBe("Maria da Silva");
        expect(getDecryptFailureCount()).toBe(before);
    });

    test("ciphertext que não decripta continua com fallback, mas fica observável", () => {
        const errorSpy = spyOn(console, "error").mockImplementation(() => {});
        const before = getDecryptFailureCount();

        const encrypted = encryptField("dado sensível")!;
        const [version, iv, tag, ct] = encrypted.split(":");
        const tampered = [version, iv, tag, Buffer.from("outro conteúdo").toString("base64")].join(":");
        expect(ct).toBeDefined();

        expect(decryptField(tampered)).toBe(tampered);
        expect(getDecryptFailureCount()).toBe(before + 1);
        for (const call of errorSpy.mock.calls) {
            expect(call.join(" ")).not.toContain(tampered);
        }
        errorSpy.mockRestore();
    });

    test("ida e volta continua funcionando", () => {
        expect(decryptField(encryptField("CPF 123"))).toBe("CPF 123");
    });
});
