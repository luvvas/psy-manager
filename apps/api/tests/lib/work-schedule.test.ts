/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import {
    findConflicts,
    freeSlots,
    isWithinSchedule,
    localDay,
    workScheduleSchema,
    type WorkSchedule,
} from "../../src/lib/work-schedule";

const MON = 1;

function schedule(overrides: Partial<WorkSchedule> = {}): WorkSchedule {
    const days: WorkSchedule["days"] = [[], [], [], [], [], [], []];
    days[MON] = [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" },
    ];
    return { sessionMinutes: 50, bufferMinutes: 10, days, ...overrides };
}

describe("work schedule", () => {
    test("valida o formato do expediente", () => {
        expect(workScheduleSchema.safeParse(schedule()).success).toBe(true);
        const bad = schedule();
        bad.days[MON] = [{ start: "12:00", end: "08:00" }];
        expect(workScheduleSchema.safeParse(bad).success).toBe(false);
        expect(workScheduleSchema.safeParse({ ...schedule(), days: [[]] }).success).toBe(false);
    });

    test("calcula o dia local em America/Sao_Paulo, não em UTC", () => {
        // 23:30 de segunda em São Paulo = 02:30 UTC de terça
        expect(localDay(new Date("2026-11-03T02:30:00.000Z"))).toEqual({ key: "2026-11-02", weekday: MON });
        // meia-noite local enviada pelo navegador
        expect(localDay(new Date("2026-11-02T03:00:00.000Z"))).toEqual({ key: "2026-11-02", weekday: MON });
    });

    test("detecta sobreposição sem contar sessões que só encostam", () => {
        const busy = [
            { id: "a", startTime: "09:00", endTime: "09:50" },
            { id: "b", startTime: "10:00", endTime: "10:50" },
        ];
        expect(findConflicts("09:30", "10:20", busy).map((b) => b.id)).toEqual(["a", "b"]);
        expect(findConflicts("09:50", "10:00", busy)).toEqual([]);
    });

    test("verifica se a sessão cabe inteira num turno", () => {
        expect(isWithinSchedule(schedule(), MON, "08:00", "08:50")).toBe(true);
        expect(isWithinSchedule(schedule(), MON, "11:30", "12:20")).toBe(false); // invade o almoço
        expect(isWithinSchedule(schedule(), MON, "19:00", "19:50")).toBe(false);
        expect(isWithinSchedule(schedule(), 0, "09:00", "09:50")).toBe(false); // domingo sem turno
    });

    test("lista horários livres por turno, contornando sessões marcadas", () => {
        const slots = freeSlots(schedule(), MON, [{ id: "x", startTime: "09:15", endTime: "10:00" }]);
        expect(slots.slice(0, 3)).toEqual([
            { start: "08:00", end: "08:50" },
            { start: "10:10", end: "11:00" }, // pula para depois da sessão + intervalo
            { start: "11:10", end: "12:00" },
        ]);
        expect(slots[3]).toEqual({ start: "14:00", end: "14:50" });
        expect(slots.at(-1)).toEqual({ start: "17:00", end: "17:50" });
    });

    test("descarta horários que já passaram", () => {
        const slots = freeSlots(schedule(), MON, [], 15 * 60);
        expect(slots[0]).toEqual({ start: "15:00", end: "15:50" });
        expect(freeSlots(schedule(), MON, [], Infinity)).toEqual([]);
    });
});
