/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import path from "path";
import {
    assertOwnStorageKey,
    buildStorageKey,
    isOwnStorageKey,
    toLocalFilePath,
} from "../../src/utils/storage.utils";

const OWNER = "user-123";

describe("isOwnStorageKey (issue #38)", () => {
    test("aceita as chaves geradas por buildStorageKey para o próprio usuário", () => {
        expect(isOwnStorageKey(OWNER, buildStorageKey(OWNER, "laudo.pdf"))).toBe(true);
    });

    test("recusa chaves de outro psicólogo, fora do prefixo ou com traversal", () => {
        const forged = [
            "documents/other-user/victim.pdf",
            "documents/user-1234/x.pdf", // prefixo parecido, outro usuário
            "documents/user-123/", // sem arquivo
            "documents/user-123/../other-user/victim.pdf",
            "documents/user-123/sub/x.pdf",
            "documents/user-123/..\\other-user\\victim.pdf",
            "stored/report.pdf",
            "",
        ];
        for (const key of forged) {
            expect(isOwnStorageKey(OWNER, key)).toBe(false);
        }
        expect(isOwnStorageKey("", "documents//x.pdf")).toBe(false);
    });

    test("assertOwnStorageKey lança erro para chave alheia", () => {
        expect(() => assertOwnStorageKey(OWNER, "documents/other-user/victim.pdf")).toThrow(
            "Chave de storage invalida."
        );
        expect(() => assertOwnStorageKey(OWNER, `documents/${OWNER}/ok.pdf`)).not.toThrow();
    });
});

describe("toLocalFilePath", () => {
    test("continua barrando path traversal no driver local", () => {
        expect(() => toLocalFilePath("../../etc/passwd")).toThrow("Chave de storage invalida.");
        expect(() => toLocalFilePath("..\\..\\etc\\passwd")).toThrow("Chave de storage invalida.");
        expect(toLocalFilePath(`documents/${OWNER}/ok.pdf`)).toEndWith(
            path.join("documents", OWNER, "ok.pdf")
        );
    });
});
