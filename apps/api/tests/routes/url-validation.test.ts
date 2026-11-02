/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import { isHttpUrl, isSafeDocumentUrl, optionalHttpUrl } from "../../src/utils/url.utils";
import {
    appointmentCommands,
    appointmentInput,
    caller,
    clinicalRecordInput,
    clinicalRecordService,
    resetRouterTestState,
    state,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

const MALICIOUS = [
    "javascript:alert(document.cookie)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
];

describe("validação de esquema de URL", () => {
    test("isHttpUrl aceita só http(s) absolutas", () => {
        expect(isHttpUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
        expect(isHttpUrl("http://localhost:5173/x")).toBe(true);
        for (const url of [...MALICIOUS, "data:application/pdf;base64,AAAA", "meet.google.com/abc", ""]) {
            expect(isHttpUrl(url)).toBe(false);
        }
    });

    test("isSafeDocumentUrl aceita também PDF inline legado, e nenhum outro data:", () => {
        expect(isSafeDocumentUrl("data:application/pdf;base64,AAAA")).toBe(true);
        expect(isSafeDocumentUrl("https://bucket.example.com/doc.pdf")).toBe(true);
        for (const url of MALICIOUS) expect(isSafeDocumentUrl(url)).toBe(false);
    });

    test("optionalHttpUrl trata vazio como ausente", () => {
        expect(optionalHttpUrl.safeParse(undefined).success).toBe(true);
        expect(optionalHttpUrl.safeParse("").success).toBe(true);
        expect(optionalHttpUrl.safeParse("https://zoom.us/j/123").success).toBe(true);
        expect(optionalHttpUrl.safeParse("javascript:alert(1)").success).toBe(false);
    });

    test("appointment.create/update recusam meetingUrl fora de http(s)", async () => {
        for (const meetingUrl of MALICIOUS) {
            await expect(caller().appointment.create(appointmentInput({ meetingUrl }))).rejects.toMatchObject({
                code: "BAD_REQUEST",
            });
            await expect(
                caller().appointment.update({ id: "appointment-1", ...appointmentInput({ meetingUrl }) })
            ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        }
        expect(appointmentCommands.schedule).not.toHaveBeenCalled();

        await expect(
            caller().appointment.create(appointmentInput({ meetingUrl: "https://meet.google.com/abc-defg-hij" }))
        ).resolves.toBeDefined();
    });

    test("clinicalRecord.create recusa fileUrl fora de http(s)", async () => {
        await expect(
            caller().clinicalRecord.create(clinicalRecordInput({ fileUrl: "javascript:alert(1)" }))
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        expect(clinicalRecordService.create).not.toHaveBeenCalled();
    });

    test("getDownloadUrl não devolve como URL um valor legado perigoso", async () => {
        state.documentById = { id: "document-1", content: "javascript:alert(1)" };
        await expect(caller().document.getDownloadUrl({ id: "document-1" })).resolves.toEqual({ url: null });

        state.clinicalRecordById = { id: "record-1", fileUrl: "data:text/html,<script>alert(1)</script>" };
        await expect(caller().clinicalRecord.getDownloadUrl({ id: "record-1" })).resolves.toEqual({ url: null });
    });
});
