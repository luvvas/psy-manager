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

    // Issue #37: listar todos os usuários expunha nome, CRP e cidade de toda a
    // plataforma (e os IDs usados como prefixo no storage).
    test("não expõe mais o diretório de psicólogos", async () => {
        const psychologist = caller().psychologist as unknown as { list: () => Promise<unknown> };
        await expect(psychologist.list()).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
});
