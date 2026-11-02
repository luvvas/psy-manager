/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    USER_ID,
    appointmentCommands,
    appointmentInput,
    availabilityService,
    callArg,
    caller,
    callerWithId,
    dbInsertValues,
    dbUpdateSet,
    googleCalendarService,
    resetRouterTestState,
    state,
    tokenFetch,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

async function googleState(c = caller()) {
    const { url } = await c.appointment.getGoogleAuthUrl();
    return new URL(url).searchParams.get("state")!;
}

describe("appointment API", () => {
    test("lists, creates, updates, and deletes appointments", async () => {
        await expect(caller().appointment.list()).resolves.toMatchObject([{ id: "appointment-1" }]);
        await expect(caller().appointment.create(appointmentInput())).resolves.toEqual({
            id: "appointment-1",
            success: true,
        });

        const scheduled = callArg(appointmentCommands.schedule) as any;
        expect(scheduled.psychologistId).toBe(USER_ID);
        expect(scheduled.date).toBeInstanceOf(Date);

        await expect(caller().appointment.update({ id: "appointment-1", ...appointmentInput() })).resolves.toEqual({
            success: true,
        });
        expect((callArg(appointmentCommands.reschedule) as any).psychologistId).toBe(USER_ID);

        await expect(caller().appointment.delete({ id: "appointment-1" })).resolves.toEqual({ success: true });
        expect(appointmentCommands.cancel).toHaveBeenCalledWith({
            id: "appointment-1",
            psychologistId: USER_ID,
        });
    });

    test("pede confirmação para conflito de horário ou fora do expediente", async () => {
        state.slotCheck = {
            conflicts: [{ id: "other", startTime: "09:30", endTime: "10:20", patientName: "Bia" }],
            roomConflicts: [],
            outsideSchedule: true,
            unchanged: false,
        };

        await expect(caller().appointment.create(appointmentInput())).rejects.toMatchObject({
            code: "CONFLICT",
            message: expect.stringContaining("09:30 às 10:20"),
        });
        await expect(
            caller().appointment.update({ id: "appointment-1", ...appointmentInput() })
        ).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("fora do seu expediente") });
        expect(appointmentCommands.schedule).not.toHaveBeenCalled();
        expect(appointmentCommands.reschedule).not.toHaveBeenCalled();
        expect((callArg(availabilityService.checkSlot, 1, 1) as any).excludeId).toBe("appointment-1");

        await caller().appointment.create(appointmentInput({ allowScheduleConflicts: true }));
        const scheduled = callArg(appointmentCommands.schedule) as any;
        expect(scheduled).not.toHaveProperty("allowScheduleConflicts");
    });

    test("não pede confirmação ao cancelar nem quando o horário salvo não mudou", async () => {
        state.slotCheck = { conflicts: [], roomConflicts: [], freeRooms: null, outsideSchedule: null, unchanged: true };
        await expect(caller().appointment.update({ id: "appointment-1", ...appointmentInput() })).resolves.toEqual({
            success: true,
        });

        state.slotCheck = {
            conflicts: [{ id: "o", startTime: "09:00", endTime: "10:00" }],
            roomConflicts: [{ id: "r", startTime: "09:00", endTime: "10:00", psychologistName: "Ana", isOwn: false }],
            outsideSchedule: true,
        };
        await caller().appointment.update({ id: "appointment-1", ...appointmentInput({ status: "cancelled" }) });
        expect(appointmentCommands.reschedule).toHaveBeenCalledTimes(2);
    });

    test("sala ocupada bloqueia mesmo com a confirmação", async () => {
        state.slotCheck = {
            conflicts: [],
            roomConflicts: [{ id: "x", startTime: "09:00", endTime: "09:50", psychologistName: "Dra. Ana", isOwn: false }],
            outsideSchedule: false,
            unchanged: false,
        };
        await expect(
            caller().appointment.create(
                appointmentInput({ sessionType: "in_person", roomId: "room-1", allowScheduleConflicts: true })
            )
        ).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Dra. Ana") });
        expect(appointmentCommands.schedule).not.toHaveBeenCalled();
    });

    test("grava sala e clínica vindas do banco, também em sessão online atendida da sala", async () => {
        await caller().appointment.create(appointmentInput({ sessionType: "in_person", roomId: "room-1" }));
        expect(callArg(appointmentCommands.schedule)).toMatchObject({ roomId: "room-1", clinicId: "clinic-1" });
        expect((callArg(availabilityService.checkSlot, 0, 1) as any).roomId).toBe("room-1");

        await caller().appointment.create(appointmentInput({ sessionType: "online", roomId: "room-1" }));
        expect(callArg(appointmentCommands.schedule, 1)).toMatchObject({ roomId: "room-1", clinicId: "clinic-1" });

        await caller().appointment.create(appointmentInput({ sessionType: "online" }));
        expect(callArg(appointmentCommands.schedule, 2)).toMatchObject({ roomId: null, clinicId: null });
    });

    test("recusa sala de clínica da qual não é membro", async () => {
        state.roomAccessRows = [];
        await expect(
            caller().appointment.create(appointmentInput({ sessionType: "in_person", roomId: "room-alheia" }))
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        await expect(
            caller().appointment.freeSlots({ date: "2026-05-20T03:00:00.000Z", roomId: "room-alheia" })
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(appointmentCommands.schedule).not.toHaveBeenCalled();
        expect(availabilityService.freeSlots).not.toHaveBeenCalled();
    });

    test("recusa horário inválido ou fim antes do início", async () => {
        await expect(caller().appointment.create(appointmentInput({ startTime: "9h" }))).rejects.toMatchObject({
            code: "BAD_REQUEST",
        });
        await expect(
            caller().appointment.create(appointmentInput({ startTime: "10:00", endTime: "09:00" }))
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        // A confirmação não passa por cima da validação do horário.
        await expect(
            caller().appointment.create(
                appointmentInput({ startTime: "10:00", endTime: "09:00", allowScheduleConflicts: true })
            )
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    test("expõe checkSlot e freeSlots do próprio psicólogo", async () => {
        await caller().appointment.checkSlot({ date: "2026-05-20T03:00:00.000Z", startTime: "09:00", endTime: "09:50" });
        expect(callArg(availabilityService.checkSlot, 0, 0)).toBe(USER_ID);

        await expect(caller().appointment.freeSlots({ date: "2026-05-20T03:00:00.000Z" })).resolves.toMatchObject({
            configured: true,
        });
        expect(callArg(availabilityService.freeSlots, 0, 0)).toBe(USER_ID);
    });

    test("rejects appointment writes when patient ownership is not found", async () => {
        state.ownedPatientRows = [];

        await expect(caller().appointment.create(appointmentInput())).rejects.toMatchObject({
            code: "FORBIDDEN",
        });
        expect(appointmentCommands.schedule).not.toHaveBeenCalled();
    });

    test("handles Google Calendar helpers", async () => {
        await expect(caller().appointment.isConnectedGoogle()).resolves.toBe(true);
        await expect(caller().appointment.syncGoogle()).resolves.toEqual({ imported: 1, skipped: 0 });

        const { url } = await caller().appointment.getGoogleAuthUrl();
        const parsed = new URL(url);
        expect(parsed.searchParams.get("client_id")).toBe("google-client");
        // state aleatório de uso único, não mais o id do usuário (auditoria F3)
        expect(parsed.searchParams.get("state")).not.toBe(USER_ID);
        expect(parsed.searchParams.get("state")!.length).toBeGreaterThanOrEqual(40);

        expect(googleCalendarService.isConnected).toHaveBeenCalledWith(USER_ID);
        expect(googleCalendarService.syncEvents).toHaveBeenCalledWith(USER_ID);
    });

    test("connects Google Calendar by inserting a new account", async () => {
        await expect(caller().appointment.connectGoogleCalendar({ code: "oauth-code", state: await googleState() })).resolves.toEqual({
            success: true,
        });

        expect(tokenFetch).toHaveBeenCalled();
        const inserted = callArg(dbInsertValues) as any;
        expect(inserted.userId).toBe(USER_ID);
        expect(inserted.providerId).toBe("google");
        expect(inserted.accessToken).toBe("access-token");
        expect(inserted.refreshToken).toBe("refresh-token");
    });

    describe("cross-user appointment isolation", () => {
        test("appointment.create is FORBIDDEN when the patient belongs to another user", async () => {
            state.ownedPatientRows = [];
            const other = callerWithId("user-456");
            await expect(other.appointment.create(appointmentInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
            expect(appointmentCommands.schedule).not.toHaveBeenCalled();
        });

        test("appointment.create injects the caller's ID as psychologistId", async () => {
            const other = callerWithId("user-456");
            await other.appointment.create(appointmentInput());
            expect((callArg(appointmentCommands.schedule) as any).psychologistId).toBe("user-456");
        });

        test("appointment.delete passes the caller's ID so another user cannot cancel", async () => {
            const other = callerWithId("user-456");
            await other.appointment.delete({ id: "appointment-1" });
            expect(appointmentCommands.cancel).toHaveBeenCalledWith({
                id: "appointment-1",
                psychologistId: "user-456",
            });
        });
    });

    test("connects Google Calendar by updating an existing account", async () => {
        state.googleAccountRows = [{ id: "account-1", refreshToken: "old-refresh-token" }];
        tokenFetch.mockImplementationOnce(async () =>
            new Response(
                JSON.stringify({
                    access_token: "new-access-token",
                    expires_in: 3600,
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            )
        );

        await expect(caller().appointment.connectGoogleCalendar({ code: "oauth-code", state: await googleState() })).resolves.toEqual({
            success: true,
        });

        const updated = callArg(dbUpdateSet) as any;
        expect(updated.accessToken).toBe("new-access-token");
        expect(updated.refreshToken).toBe("old-refresh-token");
        expect(dbInsertValues).not.toHaveBeenCalled();
    });

    describe("state do OAuth do Google (auditoria F3)", () => {
        test("recusa state ausente na URL, forjado, de outro usuário ou reutilizado", async () => {
            await expect(
                caller().appointment.connectGoogleCalendar({ code: "oauth-code", state: "forjado" })
            ).rejects.toMatchObject({ code: "FORBIDDEN" });

            const stateDeOutro = await googleState(callerWithId("user-456"));
            await expect(
                caller().appointment.connectGoogleCalendar({ code: "oauth-code", state: stateDeOutro })
            ).rejects.toMatchObject({ code: "FORBIDDEN" });

            const valido = await googleState();
            await expect(
                caller().appointment.connectGoogleCalendar({ code: "oauth-code", state: valido })
            ).resolves.toEqual({ success: true });
            await expect(
                caller().appointment.connectGoogleCalendar({ code: "oauth-code", state: valido })
            ).rejects.toMatchObject({ code: "FORBIDDEN" });
        });

        test("cada URL de autorização tem um state diferente", async () => {
            expect(await googleState()).not.toBe(await googleState());
        });
    });
});
