/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { isHttpUrl, safeUrl } from "../src/utils/safe-url";

describe("safeUrl", () => {
    test("bloqueia javascript:, data: e outros esquemas, inclusive de registros legados", () => {
        for (const url of [
            "javascript:alert(document.cookie)",
            "JavaScript:alert(1)",
            "  javascript:alert(1)",
            "java\tscript:alert(1)",
            "data:text/html,<script>alert(1)</script>",
            "vbscript:msgbox(1)",
        ]) {
            expect(safeUrl(url)).toBeUndefined();
            expect(safeUrl(url, { allowPdfDataUrl: true })).toBeUndefined();
        }
    });

    test("deixa passar https e caminhos relativos da própria origem", () => {
        expect(safeUrl("https://meet.google.com/abc-defg-hij")).toBe("https://meet.google.com/abc-defg-hij");
        expect(safeUrl("/api/storage/local-download/token")).toBe("/api/storage/local-download/token");
    });

    test("PDF inline legado só passa quando permitido", () => {
        const pdf = "data:application/pdf;base64,JVBERi0=";
        expect(safeUrl(pdf)).toBeUndefined();
        expect(safeUrl(pdf, { allowPdfDataUrl: true })).toBe(pdf);
    });

    test("vazio vira undefined", () => {
        expect(safeUrl("")).toBeUndefined();
        expect(safeUrl(null)).toBeUndefined();
        expect(safeUrl(undefined)).toBeUndefined();
    });
});

describe("isHttpUrl (validação do formulário)", () => {
    test("exige URL absoluta http(s)", () => {
        expect(isHttpUrl("https://zoom.us/j/123")).toBe(true);
        expect(isHttpUrl("meet.google.com/abc")).toBe(false);
        expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    });
});
