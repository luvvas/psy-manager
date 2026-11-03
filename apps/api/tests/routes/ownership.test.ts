/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    caller,
    clinicalRecordInput,
    clinicalRecordService,
    documentInput,
    documentService,
    financialService,
    resetRouterTestState,
    state,
    transactionInput,
    videoSessionService,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

describe("validação de posse de IDs referenciados (issue #36)", () => {
    describe("objeto de outro psicólogo → FORBIDDEN, sem gravar", () => {
        beforeEach(() => {
            state.ownedPatientRows = [];
        });

        test("financial.create e financial.update", async () => {
            await expect(caller().financial.create(transactionInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
            await expect(
                caller().financial.update({ id: "transaction-1", patientId: "patient-of-other" })
            ).rejects.toMatchObject({ code: "FORBIDDEN" });
            expect(financialService.create).not.toHaveBeenCalled();
            expect(financialService.update).not.toHaveBeenCalled();
        });

        test("document.create e document.update", async () => {
            await expect(
                caller().document.create(documentInput({ patientId: "patient-of-other" }))
            ).rejects.toMatchObject({ code: "FORBIDDEN" });
            await expect(
                caller().document.update({ id: "document-1", patientId: "patient-of-other" })
            ).rejects.toMatchObject({ code: "FORBIDDEN" });
            expect(documentService.create).not.toHaveBeenCalled();
            expect(documentService.update).not.toHaveBeenCalled();
        });

        test("videoSession.create", async () => {
            await expect(
                caller().videoSession.create({ appointmentId: "appointment-of-other" })
            ).rejects.toMatchObject({ code: "FORBIDDEN" });
            expect(videoSessionService.create).not.toHaveBeenCalled();
        });

        test("clinicalRecord.create com appointmentId", async () => {
            await expect(
                caller().clinicalRecord.create(clinicalRecordInput({ appointmentId: "appointment-of-other" }))
            ).rejects.toMatchObject({ code: "FORBIDDEN" });
            expect(clinicalRecordService.create).not.toHaveBeenCalled();
        });
    });

    test("IDs do próprio usuário, ou ausentes, continuam funcionando", async () => {
        await expect(caller().financial.create(transactionInput())).resolves.toMatchObject({ id: "transaction-1" });
        await expect(
            caller().financial.update({ id: "transaction-1", patientId: "patient-1" })
        ).resolves.toMatchObject({ id: "transaction-1" });
        await expect(
            caller().document.create(documentInput({ patientId: "patient-1" }))
        ).resolves.toMatchObject({ id: "document-1" });
        await expect(caller().videoSession.create({ appointmentId: "appointment-1" })).resolves.toMatchObject({
            sessionId: "video-1",
        });

        state.ownedPatientRows = [];
        await expect(caller().financial.create(transactionInput({ patientId: null }))).resolves.toMatchObject({
            id: "transaction-1",
        });
        await expect(caller().videoSession.create({})).resolves.toMatchObject({ sessionId: "video-1" });
    });
});
