/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { reminderLabel, reminderOptions } from "../src/lib/reminder";

describe("reminderLabel", () => {
    it("escreve a antecedência em minutos, horas ou dias", () => {
        expect(reminderLabel(30)).toBe("30 minutos antes");
        expect(reminderLabel(60)).toBe("1 hora antes");
        expect(reminderLabel(180)).toBe("3 horas antes");
        expect(reminderLabel(1440)).toBe("24 horas antes");
        expect(reminderLabel(2880)).toBe("48 horas antes");
    });
});

describe("reminderOptions", () => {
    it("lista as opções padrão em ordem", () => {
        const values = reminderOptions().map((o) => o.value);
        expect(values).toEqual(["30", "60", "120", "180", "360", "720", "1440", "2880"]);
    });

    it("inclui um valor salvo fora da lista, para o select não ficar vazio", () => {
        const options = reminderOptions(15);
        expect(options[0]).toEqual({ value: "15", label: "15 minutos antes" });
        expect(reminderOptions(60)).toHaveLength(8);
    });
});
