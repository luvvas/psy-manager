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

    describe("convites de clínica", () => {
        test("lista, aceita e recusa convites do próprio usuário", async () => {
            await expect(caller().clinic.listInvites()).resolves.toMatchObject([{ clinicId: "clinic-2" }]);
            expect(clinicService.listInvites).toHaveBeenCalledWith(USER_ID);

            await expect(caller().clinic.acceptInvite({ clinicId: "clinic-2" })).resolves.toEqual({ success: true });
            expect(clinicService.acceptInvite).toHaveBeenCalledWith(USER_ID, "clinic-2");
            await expect(caller().clinic.declineInvite({ clinicId: "clinic-2" })).resolves.toEqual({ success: true });
            expect(clinicService.declineInvite).toHaveBeenCalledWith(USER_ID, "clinic-2");
        });

        test("convite inexistente (ou de outro usuário) retorna NOT_FOUND", async () => {
            state.clinicInviteResult = null;
            await expect(caller().clinic.acceptInvite({ clinicId: "clinic-x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
            await expect(caller().clinic.declineInvite({ clinicId: "clinic-x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
        });

        test("leave: membro sai; dono recebe BAD_REQUEST", async () => {
            await expect(caller().clinic.leave({ clinicId: "clinic-2" })).resolves.toEqual({ success: true });
            expect(clinicService.leave).toHaveBeenCalledWith(USER_ID, "clinic-2");

            state.clinicLeaveError = new Error("O dono não pode sair da própria clínica.");
            await expect(caller().clinic.leave({ clinicId: "clinic-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
        });
    });

    test("gerencia salas pelo dono e devolve NOT_FOUND para quem não é", async () => {
        await expect(caller().clinic.addRoom({ clinicId: "clinic-1", name: " Sala 1 " })).resolves.toMatchObject({
            id: "room-1",
        });
        expect(clinicService.addRoom).toHaveBeenCalledWith(USER_ID, "clinic-1", "Sala 1");
        await caller().clinic.renameRoom({ roomId: "room-1", name: "Sala Azul" });
        expect(clinicService.renameRoom).toHaveBeenCalledWith(USER_ID, "room-1", "Sala Azul");
        await expect(caller().clinic.removeRoom({ roomId: "room-1" })).resolves.toEqual({ success: true });

        state.roomResult = null;
        await expect(caller().clinic.addRoom({ clinicId: "clinic-x", name: "Sala" })).rejects.toMatchObject({
            code: "NOT_FOUND",
        });
        await expect(caller().clinic.removeRoom({ roomId: "room-x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
        await expect(caller().clinic.addRoom({ clinicId: "clinic-1", name: "   " })).rejects.toMatchObject({
            code: "BAD_REQUEST",
        });
    });
});
