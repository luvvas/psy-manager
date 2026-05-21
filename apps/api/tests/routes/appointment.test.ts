/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    USER_ID,
    appointmentCommands,
    appointmentInput,
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
        expect(parsed.searchParams.get("state")).toBe(USER_ID);

        expect(googleCalendarService.isConnected).toHaveBeenCalledWith(USER_ID);
        expect(googleCalendarService.syncEvents).toHaveBeenCalledWith(USER_ID);
    });

    test("connects Google Calendar by inserting a new account", async () => {
        await expect(caller().appointment.connectGoogleCalendar({ code: "oauth-code" })).resolves.toEqual({
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

        await expect(caller().appointment.connectGoogleCalendar({ code: "oauth-code" })).resolves.toEqual({
            success: true,
        });

        const updated = callArg(dbUpdateSet) as any;
        expect(updated.accessToken).toBe("new-access-token");
        expect(updated.refreshToken).toBe("old-refresh-token");
        expect(dbInsertValues).not.toHaveBeenCalled();
    });
});
