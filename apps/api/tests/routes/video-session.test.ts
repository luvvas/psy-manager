/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    USER_ID,
    caller,
    createAuthToken,
    resetRouterTestState,
    state,
    videoSessionService,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

describe("video session API", () => {
    test("creates, fetches, ends, and validates video sessions", async () => {
        await expect(caller().videoSession.create({ appointmentId: "appointment-1" })).resolves.toEqual({
            sessionId: "video-1",
            patientJoinUrl: "http://localhost:5173/consulta/entrar/patient-token",
            wsAuthToken: "ws-auth-token",
        });
        expect(videoSessionService.create).toHaveBeenCalledWith(USER_ID, "appointment-1");
        expect(createAuthToken).toHaveBeenCalledWith("video-1");

        const fetched = await caller().videoSession.get({ id: "video-1" });
        expect(fetched.id).toBe("video-1");
        expect(fetched.iceServers).toEqual([{ urls: "stun:stun.l.google.com:19302" }]);

        await expect(caller().videoSession.end({ id: "video-1" })).resolves.toEqual({ success: true });
        expect(videoSessionService.end).toHaveBeenCalledWith(USER_ID, "video-1");

        await expect(caller().videoSession.validateToken({ token: "patient-token" })).resolves.toEqual({
            sessionId: "video-1",
            psychologistName: "Ana",
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
    });

    test("maps video session lookup and token failures", async () => {
        state.videoSessionById = null;
        await expect(caller().videoSession.get({ id: "missing" })).rejects.toMatchObject({
            code: "NOT_FOUND",
        });

        state.validatedVideoSession = null;
        await expect(caller().videoSession.validateToken({ token: "missing-token" })).rejects.toMatchObject({
            code: "NOT_FOUND",
        });

        state.validatedVideoSession = {
            id: "video-1",
            status: "ended",
            expiresAt: new Date(Date.now() + 60_000),
            psychologistName: "Ana",
        };
        await expect(caller().videoSession.validateToken({ token: "ended-token" })).rejects.toMatchObject({
            code: "PRECONDITION_FAILED",
        });

        state.validatedVideoSession = {
            id: "video-1",
            status: "pending",
            expiresAt: new Date(Date.now() - 60_000),
            psychologistName: "Ana",
        };
        await expect(caller().videoSession.validateToken({ token: "expired-token" })).rejects.toMatchObject({
            code: "PRECONDITION_FAILED",
        });
    });
});
