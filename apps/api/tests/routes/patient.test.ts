/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    USER_ID,
    callArg,
    caller,
    callerWithId,
    patientCommands,
    patientInput,
    patientQueries,
    resetRouterTestState,
    state,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

describe("patient API", () => {
    test("lists and fetches patients for the current user", async () => {
        await expect(caller().patient.list()).resolves.toMatchObject([{ id: "patient-1" }]);
        await expect(caller().patient.getById({ id: "patient-1" })).resolves.toEqual(state.patientById);

        expect(patientQueries.list).toHaveBeenCalledWith(USER_ID);
        expect(patientQueries.findById).toHaveBeenCalledWith(USER_ID, "patient-1");
    });

    test("returns NOT_FOUND when a patient does not exist", async () => {
        state.patientById = null;

        await expect(caller().patient.getById({ id: "missing" })).rejects.toMatchObject({
            code: "NOT_FOUND",
        });
    });

    test("creates, updates, deletes, and imports patients through commands", async () => {
        await expect(
            caller().patient.create(
                patientInput({ dataInicioAcompanhamento: "2026-01-01T00:00:00.000Z" })
            )
        ).resolves.toEqual({ id: "patient-1", success: true });

        const created = callArg(patientCommands.create) as any;
        expect(created.psychologistId).toBe(USER_ID);
        expect(created.dataNascimento).toBeInstanceOf(Date);
        expect(created.dataInicioAcompanhamento).toBeInstanceOf(Date);

        await expect(caller().patient.update({ id: "patient-1", ...patientInput() })).resolves.toEqual({
            success: true,
        });
        expect((callArg(patientCommands.update) as any).psychologistId).toBe(USER_ID);

        await expect(caller().patient.delete({ id: "patient-1" })).resolves.toEqual({ success: true });
        expect(patientCommands.delete).toHaveBeenCalledWith({
            id: "patient-1",
            psychologistId: USER_ID,
        });

        await expect(caller().patient.createMany([patientInput({ email: "imported@example.com" })])).resolves.toEqual({
            count: 1,
        });
        expect((callArg(patientCommands.create, 1) as any).psychologistId).toBe(USER_ID);
    });

    describe("cross-user data isolation", () => {
        test("patient.list is scoped to the authenticated user ID", async () => {
            const other = callerWithId("user-456");
            await other.patient.list();
            expect(patientQueries.list).toHaveBeenCalledWith("user-456");
            expect(patientQueries.list).not.toHaveBeenCalledWith(USER_ID);
        });

        test("patient.getById passes the caller's ID so another user's patient returns NOT_FOUND", async () => {
            state.patientById = null;
            const other = callerWithId("user-456");
            await expect(other.patient.getById({ id: "patient-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
            expect(patientQueries.findById).toHaveBeenCalledWith("user-456", "patient-1");
        });

        test("patient.create injects the caller's ID as psychologistId", async () => {
            const other = callerWithId("user-456");
            await other.patient.create(patientInput());
            expect((callArg(patientCommands.create) as any).psychologistId).toBe("user-456");
        });
    });
});
