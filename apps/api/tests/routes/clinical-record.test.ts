/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    USER_ID,
    caller,
    clinicalRecordInput,
    resetRouterTestState,
    state,
    storageService,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

describe("clinical record API", () => {
    test("covers upload preparation, listing, fetching, CRUD, finalization, and inline downloads", async () => {
        const upload = { fileName: "record.pdf", contentType: "application/pdf" as const, fileSize: 1024 };

        await expect(caller().clinicalRecord.prepareUpload(upload)).resolves.toMatchObject({
            driver: "local",
            method: "PUT",
        });
        expect(storageService.createUploadTarget).toHaveBeenCalledWith(USER_ID, upload);

        await expect(caller().clinicalRecord.getDownloadUrl({ id: "record-1" })).resolves.toEqual({
            url: "inline-file",
        });
        await expect(caller().clinicalRecord.list({ patientId: "patient-1" })).resolves.toMatchObject([
            { id: "record-1" },
        ]);
        await expect(caller().clinicalRecord.getById({ id: "record-1" })).resolves.toEqual(state.clinicalRecordById);
        await expect(caller().clinicalRecord.create(clinicalRecordInput())).resolves.toMatchObject({
            id: "record-1",
        });
        await expect(caller().clinicalRecord.update({ id: "record-1", title: "Updated" })).resolves.toMatchObject({
            id: "record-1",
            title: "Updated",
        });
        await expect(caller().clinicalRecord.finalize({ id: "record-1" })).resolves.toEqual({
            id: "record-1",
            status: "finalized",
        });
        await expect(caller().clinicalRecord.delete({ id: "record-1" })).resolves.toEqual({ success: true });
    });

    test("creates signed download URLs for stored records and returns null for missing records", async () => {
        state.clinicalRecordById = { id: "record-1", storageKey: "stored/record.pdf" };

        await expect(caller().clinicalRecord.getDownloadUrl({ id: "record-1" })).resolves.toEqual({
            url: "/api/storage/local-download/stored/record.pdf",
        });
        expect(storageService.createReadUrl).toHaveBeenCalledWith("stored/record.pdf", USER_ID);

        state.clinicalRecordById = null;
        await expect(caller().clinicalRecord.getDownloadUrl({ id: "missing" })).resolves.toBeNull();
    });

    test("maps clinical record service failures to tRPC errors", async () => {
        state.clinicalRecordCreateError = new Error("patient unavailable");
        await expect(caller().clinicalRecord.create(clinicalRecordInput())).rejects.toMatchObject({
            code: "FORBIDDEN",
            message: "patient unavailable",
        });

        state.clinicalRecordUpdateError = new Error("record locked");
        await expect(caller().clinicalRecord.update({ id: "record-1", title: "Updated" })).rejects.toMatchObject({
            code: "FORBIDDEN",
            message: "record locked",
        });

        state.clinicalRecordFinalizeError = new Error("record missing");
        await expect(caller().clinicalRecord.finalize({ id: "record-1" })).rejects.toMatchObject({
            code: "NOT_FOUND",
            message: "record missing",
        });

        state.clinicalRecordDeleteError = new Error("cannot delete");
        await expect(caller().clinicalRecord.delete({ id: "record-1" })).rejects.toMatchObject({
            code: "FORBIDDEN",
            message: "cannot delete",
        });
    });
});
