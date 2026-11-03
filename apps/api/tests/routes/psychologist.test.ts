/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    USER_ID,
    caller,
    psychologistService,
    resetRouterTestState,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

describe("psychologist API", () => {
    test("gets and updates the authenticated psychologist", async () => {
        await expect(caller().psychologist.me()).resolves.toMatchObject({ id: USER_ID });
        await expect(
            caller().psychologist.updateProfile({
                name: "Lucas",
                themeConfig: { primary: "#111111" },
            })
        ).resolves.toMatchObject({ id: USER_ID, name: "Lucas", themeConfig: { primary: "#111111" } });

        expect(psychologistService.getById).toHaveBeenCalledWith(USER_ID);
        expect(psychologistService.updateProfile).toHaveBeenCalledWith(USER_ID, {
            name: "Lucas",
            themeConfig: { primary: "#111111" },
        });
    });

    test("salva o expediente e recusa turno inválido", async () => {
        const days = [[], [{ start: "08:00", end: "12:00" }], [], [], [], [], []];
        await caller().psychologist.updateProfile({ workSchedule: { sessionMinutes: 50, bufferMinutes: 10, days } });
        expect(psychologistService.updateProfile).toHaveBeenCalledWith(USER_ID, {
            workSchedule: { sessionMinutes: 50, bufferMinutes: 10, days },
        });

        const invalid = [[], [{ start: "12:00", end: "08:00" }], [], [], [], [], []];
        await expect(
            caller().psychologist.updateProfile({ workSchedule: { sessionMinutes: 50, bufferMinutes: 10, days: invalid } })
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    test("não expõe mais o diretório de psicólogos", async () => {
        const psychologist = caller().psychologist as unknown as { list: () => Promise<unknown> };
        await expect(psychologist.list()).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
});
