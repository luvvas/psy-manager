/// <reference types="bun" />

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { randomBytes } from "crypto";

process.env.ENCRYPTION_KEY ??= randomBytes(32).toString("base64");
const {
    checkEncryptionKeys,
    decrypt,
    decryptField,
    decryptWithKeyIndex,
    encrypt,
    encryptField,
    getDecryptFailureCount,
    getKeyRing,
    isCiphertext,
    keyFingerprints,
} = await import("../../src/lib/encryption");

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

describe("key ring (ENCRYPTION_KEYS)", () => {
    const original = { ENCRYPTION_KEYS: process.env.ENCRYPTION_KEYS, ENCRYPTION_KEY: process.env.ENCRYPTION_KEY };
    const antiga = randomBytes(32).toString("base64");
    const nova = randomBytes(32).toString("base64");

    function useKeys(keys: { ENCRYPTION_KEYS?: string; ENCRYPTION_KEY?: string }) {
        delete process.env.ENCRYPTION_KEYS;
        delete process.env.ENCRYPTION_KEY;
        for (const [name, value] of Object.entries(keys)) {
            if (value !== undefined) process.env[name] = value;
        }
    }

    afterEach(() => useKeys(original));

    test("duas chaves decriptam dados cifrados com qualquer uma delas", () => {
        useKeys({ ENCRYPTION_KEY: antiga });
        const daAntiga = encrypt("Maria antiga");
        useKeys({ ENCRYPTION_KEYS: nova });
        const daNova = encrypt("Maria nova");

        useKeys({ ENCRYPTION_KEYS: `${nova},${antiga}` });
        expect(decryptWithKeyIndex(daAntiga)).toEqual({ plaintext: "Maria antiga", keyIndex: 1 });
        expect(decryptWithKeyIndex(daNova)).toEqual({ plaintext: "Maria nova", keyIndex: 0 });
        expect(decryptField(daAntiga)).toBe("Maria antiga");
    });

    test("encrypt usa sempre a primeira chave", () => {
        useKeys({ ENCRYPTION_KEYS: `${nova},${antiga}` });
        const cifrado = encrypt("CPF 123");
        expect(decryptWithKeyIndex(cifrado).keyIndex).toBe(0);
        useKeys({ ENCRYPTION_KEYS: nova });
        expect(decrypt(cifrado)).toBe("CPF 123");
        useKeys({ ENCRYPTION_KEYS: antiga });
        expect(() => decrypt(cifrado)).toThrow();
    });

    test("chave errada falha e decryptField mantém o fallback", () => {
        useKeys({ ENCRYPTION_KEYS: antiga });
        const cifrado = encrypt("dado sensível");
        useKeys({ ENCRYPTION_KEYS: `${nova},${randomBytes(32).toString("base64")}` });
        expect(() => decrypt(cifrado)).toThrow("Nenhuma das 2 chave(s)");
        const errorSpy = spyOn(console, "error").mockImplementation(() => {});
        expect(decryptField(cifrado)).toBe(cifrado);
        errorSpy.mockRestore();
    });

    test("isCiphertext só reconhece IV de 12 e tag de 16 bytes", () => {
        useKeys({ ENCRYPTION_KEY: antiga });
        const cifrado = encrypt("x");
        expect(isCiphertext(cifrado)).toBe(true);
        expect(isCiphertext(cifrado.slice(3))).toBe(true);
        expect(isCiphertext("10:30:00")).toBe(false);
        expect(isCiphertext("Rua:Centro:SP")).toBe(false);
        expect(keyFingerprints()).toHaveLength(1);
        expect(keyFingerprints()[0]).toMatch(/^[0-9a-f]{8}$/);
    });

    test("ENCRYPTION_KEY sozinha continua funcionando", () => {
        useKeys({ ENCRYPTION_KEY: antiga });
        expect(getKeyRing()).toHaveLength(1);
        expect(decrypt(encrypt("ok"))).toBe("ok");
    });

    test("configuração inválida é recusada sem imprimir a chave", () => {
        const curta = randomBytes(16).toString("base64");
        expect(checkEncryptionKeys({})).toEqual(["ENCRYPTION_KEY (ou ENCRYPTION_KEYS) não definida."]);
        expect(checkEncryptionKeys({ ENCRYPTION_KEYS: `${nova},${antiga}` })).toEqual([]);
        expect(checkEncryptionKeys({ ENCRYPTION_KEYS: ` ${nova} , ${antiga} ` })).toEqual([]);
        expect(checkEncryptionKeys({ ENCRYPTION_KEYS: nova, ENCRYPTION_KEY: antiga })).toHaveLength(1);
        expect(checkEncryptionKeys({ ENCRYPTION_KEYS: `${nova},` })).toEqual([
            "ENCRYPTION_KEYS tem a posição 2 vazia (vírgula sobrando?).",
        ]);
        expect(checkEncryptionKeys({ ENCRYPTION_KEYS: `${nova},${curta}` })).toEqual([
            "ENCRYPTION_KEYS: a chave 2 deve ter 32 bytes depois de decodificada de base64.",
        ]);
        expect(checkEncryptionKeys({ ENCRYPTION_KEYS: `${nova},${nova}` })).toEqual(["ENCRYPTION_KEYS repete a mesma chave."]);
        expect(checkEncryptionKeys({ ENCRYPTION_KEYS: `${nova},,` })).toEqual([
            "ENCRYPTION_KEYS tem a posição 2 vazia (vírgula sobrando?).",
            "ENCRYPTION_KEYS tem a posição 3 vazia (vírgula sobrando?).",
        ]);
        expect(checkEncryptionKeys({ ENCRYPTION_KEY: `${nova},${antiga}` })).toEqual([
            "ENCRYPTION_KEY tem vírgula; para mais de uma chave use ENCRYPTION_KEYS=nova,antiga.",
        ]);
        expect(checkEncryptionKeys({ ENCRYPTION_KEYS: `${nova};${antiga}` })).toEqual([
            "ENCRYPTION_KEYS: a chave 1 deve ter 32 bytes depois de decodificada de base64.",
        ]);
        expect(checkEncryptionKeys({ ENCRYPTION_KEY: nova.replace(/\+/g, "-").replace(/\//g, "_").replace(/=$/, "") })).toEqual([]);

        useKeys({ ENCRYPTION_KEYS: `${nova},${curta}` });
        let caught: unknown;
        try {
            encrypt("x");
        } catch (err) {
            caught = err;
        }
        expect(caught).toBeInstanceOf(Error);
        expect(String(caught)).not.toContain(curta);
        expect(String(caught)).not.toContain(nova);
    });
});
