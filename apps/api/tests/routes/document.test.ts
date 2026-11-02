/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    USER_ID,
    caller,
    documentInput,
    resetRouterTestState,
    state,
    storageService,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

describe("document API", () => {
    test("covers upload preparation, listing, fetching, CRUD, and inline download URLs", async () => {
        const upload = { fileName: "report.pdf", contentType: "application/pdf" as const, fileSize: 1024 };

        await expect(caller().document.prepareUpload(upload)).resolves.toMatchObject({
            driver: "local",
            method: "PUT",
        });
        expect(storageService.createUploadTarget).toHaveBeenCalledWith(USER_ID, upload);

        await expect(caller().document.getDownloadUrl({ id: "document-1" })).resolves.toEqual({
            url: "data:application/pdf;base64,SU5MSU5F",
        });
        await expect(caller().document.list({ patientId: "patient-1", isTemplate: false })).resolves.toMatchObject([
            { id: "document-1" },
        ]);
        await expect(caller().document.getById({ id: "document-1" })).resolves.toEqual(state.documentById);

        await expect(caller().document.create(documentInput({ patientId: null }))).resolves.toMatchObject({
            id: "document-1",
            patientId: undefined,
        });
        await expect(caller().document.update({ id: "document-1", patientId: null })).resolves.toMatchObject({
            id: "document-1",
            patientId: undefined,
        });
        await expect(caller().document.delete({ id: "document-1" })).resolves.toEqual({ success: true });
    });

    test("creates signed download URLs for stored documents and returns null for missing documents", async () => {
        const key = `documents/${USER_ID}/report.pdf`;
        state.documentById = { id: "document-1", storageKey: key };

        await expect(caller().document.getDownloadUrl({ id: "document-1" })).resolves.toEqual({
            url: `/api/storage/local-download/${key}`,
        });
        expect(storageService.createReadUrl).toHaveBeenCalledWith(key, USER_ID);

        state.documentById = null;
        await expect(caller().document.getDownloadUrl({ id: "missing" })).resolves.toBeNull();
    });

    test("maps document update and delete failures to NOT_FOUND", async () => {
        state.documentUpdateError = new Error("document missing");
        await expect(caller().document.update({ id: "document-1", title: "Updated" })).rejects.toMatchObject({
            code: "NOT_FOUND",
            message: "document missing",
        });

        state.documentDeleteError = new Error("delete missing");
        await expect(caller().document.delete({ id: "document-1" })).rejects.toMatchObject({
            code: "NOT_FOUND",
            message: "delete missing",
        });
    });

    describe("storageKey de outro psicólogo (issue #38)", () => {
        const forged = "documents/other-psychologist/victim.pdf";

        test("getDownloadUrl recusa chave fora do prefixo do usuário", async () => {
            state.documentById = { id: "document-1", storageKey: forged };

            await expect(caller().document.getDownloadUrl({ id: "document-1" })).rejects.toMatchObject({
                code: "FORBIDDEN",
            });
            expect(storageService.createReadUrl).not.toHaveBeenCalled();
        });

        test("create e update recusam chave forjada e aceitam a do próprio usuário", async () => {
            for (const storageKey of [forged, `documents/${USER_ID}/../other/x.pdf`, "stored/report.pdf"]) {
                await expect(caller().document.create(documentInput({ storageKey }))).rejects.toMatchObject({
                    code: "FORBIDDEN",
                });
                await expect(caller().document.update({ id: "document-1", storageKey })).rejects.toMatchObject({
                    code: "FORBIDDEN",
                });
            }

            const own = `documents/${USER_ID}/0b7c1d2e-3f40-4a5b-8c6d-7e8f90a1b2c3.pdf`;
            await expect(caller().document.create(documentInput({ storageKey: own }))).resolves.toMatchObject({
                id: "document-1",
            });
            await expect(caller().document.update({ id: "document-1", storageKey: own })).resolves.toMatchObject({
                id: "document-1",
            });
        });
    });
});
