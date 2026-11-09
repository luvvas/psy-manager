/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { buildPixPayload, crc16, normalizePixKey } from "../src/utils/pix";

describe("crc16", () => {
    it("bate com o valor de verificação do CRC-16/CCITT-FALSE", () => {
        expect(crc16("123456789")).toBe("29B1");
    });
});

describe("normalizePixKey", () => {
    it("tira a máscara de CPF e CNPJ e põe +55 no telefone", () => {
        expect(normalizePixKey("123.456.789-01")).toBe("12345678901");
        expect(normalizePixKey("12.345.678/0001-90")).toBe("12345678000190");
        expect(normalizePixKey("(11) 98888-7777")).toBe("+5511988887777");
        expect(normalizePixKey("+55 11 98888-7777")).toBe("+5511988887777");
        expect(normalizePixKey(" ana@pix.dev ")).toBe("ana@pix.dev");
    });
});

describe("buildPixPayload", () => {
    const payload = buildPixPayload({ key: "ana@pix.dev", name: "Ana Beatriz Conceição", city: "São Paulo", amount: 400 });

    it("monta os campos do BR Code em ordem", () => {
        expect(payload.startsWith("000201")).toBe(true);
        expect(payload).toContain("0014br.gov.bcb.pix0111ana@pix.dev");
        expect(payload).toContain("5303986");
        expect(payload).toContain("5406400.00");
        expect(payload).toContain("5802BR");
        expect(payload).toContain("5921ANA BEATRIZ CONCEICAO");
        expect(payload).toContain("6009SAO PAULO");
        expect(payload).toContain("62070503***");
    });

    it("termina com o CRC do próprio conteúdo", () => {
        const body = payload.slice(0, -4);
        expect(body.endsWith("6304")).toBe(true);
        expect(payload.slice(-4)).toBe(crc16(body));
    });

    it("sem valor não inclui o campo 54", () => {
        expect(buildPixPayload({ key: "ana@pix.dev", name: "Ana", city: "SP" })).not.toContain("5406");
    });
});
