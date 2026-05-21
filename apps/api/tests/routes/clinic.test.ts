/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    USER_ID,
    callArg,
    caller,
    clinicInput,
    clinicService,
    resetRouterTestState,
    state,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

describe("clinic API", () => {
    test("covers clinic CRUD and psychologist links", async () => {
        await expect(caller().clinic.list()).resolves.toMatchObject([{ id: "clinic-1" }]);
        await expect(caller().clinic.create(clinicInput())).resolves.toMatchObject({ id: "clinic-1" });
        await expect(caller().clinic.update({ id: "clinic-1", ...clinicInput({ name: "New Name" }) })).resolves.toMatchObject({
            id: "clinic-1",
            name: "New Name",
        });
        await expect(caller().clinic.delete({ id: "clinic-1" })).resolves.toEqual({ success: true });
        await expect(
            caller().clinic.linkPsychologist({
                clinicId: "clinic-1",
                psychologistEmail: "psy@example.com",
            })
        ).resolves.toEqual({ success: true });
        await expect(
            caller().clinic.unlinkPsychologist({
                clinicId: "clinic-1",
                psychologistId: "psy-1",
            })
        ).resolves.toEqual({ success: true });

        expect(clinicService.list).toHaveBeenCalledWith(USER_ID);
        expect(clinicService.create).toHaveBeenCalledWith(USER_ID, clinicInput());
        expect(callArg(clinicService.update)).toBe(USER_ID);
        expect(clinicService.delete).toHaveBeenCalledWith(USER_ID, "clinic-1");
        expect(clinicService.linkPsychologist).toHaveBeenCalledWith(USER_ID, "clinic-1", "psy@example.com");
        expect(clinicService.unlinkPsychologist).toHaveBeenCalledWith(USER_ID, "clinic-1", "psy-1");
    });

    test("maps clinic missing and link failures to tRPC errors", async () => {
        state.clinicUpdateResult = null;
        await expect(caller().clinic.update({ id: "clinic-1", ...clinicInput() })).rejects.toMatchObject({
            code: "NOT_FOUND",
        });

        state.clinicDeleteResult = null;
        await expect(caller().clinic.delete({ id: "clinic-1" })).rejects.toMatchObject({
            code: "NOT_FOUND",
        });

        state.clinicLinkError = new Error("email missing");
        await expect(
            caller().clinic.linkPsychologist({ clinicId: "clinic-1", psychologistEmail: "psy@example.com" })
        ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "email missing" });

        state.clinicUnlinkError = new Error("not linked");
        await expect(
            caller().clinic.unlinkPsychologist({ clinicId: "clinic-1", psychologistId: "psy-1" })
        ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "not linked" });
    });
});
