/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import {
    USER_ID,
    callArg,
    caller,
    financialService,
    resetRouterTestState,
    transactionInput,
} from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

describe("financial API", () => {
    test("covers financial CRUD, imports, and date transforms", async () => {
        await expect(
            caller().financial.list({
                startDate: "2026-05-01T00:00:00.000Z",
                endDate: "2026-05-31T00:00:00.000Z",
            })
        ).resolves.toMatchObject([{ id: "transaction-1" }]);

        const listFilters = callArg(financialService.list, 0, 1) as any;
        expect(listFilters.startDate).toBeInstanceOf(Date);
        expect(listFilters.endDate).toBeInstanceOf(Date);

        await expect(caller().financial.create(transactionInput())).resolves.toMatchObject({
            id: "transaction-1",
            description: "Session",
        });
        expect((callArg(financialService.create, 0, 1) as any).date).toBeInstanceOf(Date);

        await expect(caller().financial.createMany([transactionInput({ patientId: undefined })])).resolves.toEqual({
            count: 1,
        });
        expect((callArg(financialService.createMany, 0, 1) as any[])[0].date).toBeInstanceOf(Date);

        await expect(
            caller().financial.update({
                id: "transaction-1",
                amount: 175,
                date: "2026-05-11T00:00:00.000Z",
            })
        ).resolves.toMatchObject({ id: "transaction-1", amount: 175 });
        expect((callArg(financialService.update, 0, 2) as any).date).toBeInstanceOf(Date);

        await expect(caller().financial.delete({ id: "transaction-1" })).resolves.toEqual({ success: true });
        expect(financialService.delete).toHaveBeenCalledWith(USER_ID, "transaction-1");
    });
});
