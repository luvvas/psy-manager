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
    test("gets, updates, and lists psychologists for an authenticated user", async () => {
        await expect(caller().psychologist.me()).resolves.toMatchObject({ id: USER_ID });
        await expect(
            caller().psychologist.updateProfile({
                name: "Lucas",
                themeConfig: { primary: "#111111" },
            })
        ).resolves.toMatchObject({ id: USER_ID, name: "Lucas", themeConfig: { primary: "#111111" } });
        await expect(caller().psychologist.list()).resolves.toMatchObject([{ id: USER_ID }]);

        expect(psychologistService.getById).toHaveBeenCalledWith(USER_ID);
        expect(psychologistService.updateProfile).toHaveBeenCalledWith(USER_ID, {
            name: "Lucas",
            themeConfig: { primary: "#111111" },
        });
        expect(psychologistService.list).toHaveBeenCalled();
    });
});
