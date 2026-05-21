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
            url: "inline-content",
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
        state.documentById = { id: "document-1", storageKey: "stored/report.pdf" };

        await expect(caller().document.getDownloadUrl({ id: "document-1" })).resolves.toEqual({
            url: "/api/storage/local-download/stored/report.pdf",
        });
        expect(storageService.createReadUrl).toHaveBeenCalledWith("stored/report.pdf", USER_ID);

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
});
