/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { DEFAULT_REMINDER_MINUTES, isReminderDue } from "../../src/lib/reminder";
import { localDateTime } from "../../src/lib/work-schedule";
import { buildSessionReminder } from "../../src/services/email.service";

describe("localDateTime", () => {
    test("combina o dia de São Paulo com o horário, independente do fuso do servidor", () => {
        expect(localDateTime(new Date("2026-12-02T03:00:00Z"), "14:30").toISOString()).toBe("2026-12-02T17:30:00.000Z");
        expect(localDateTime(new Date("2026-12-02T15:00:00Z"), "00:15").toISOString()).toBe("2026-12-02T03:15:00.000Z");
        expect(localDateTime(new Date("2026-12-03T01:00:00Z"), "23:00").toISOString()).toBe("2026-12-03T02:00:00.000Z");
    });
});

describe("isReminderDue", () => {
    const startsAt = new Date("2026-12-02T17:30:00Z");

    test("dispara dentro da janela e antes do início", () => {
        expect(isReminderDue(startsAt, 60, new Date("2026-12-02T16:30:00Z"))).toBe(true);
        expect(isReminderDue(startsAt, 60, new Date("2026-12-02T17:29:00Z"))).toBe(true);
    });

    test("não dispara antes da janela nem depois do início", () => {
        expect(isReminderDue(startsAt, 60, new Date("2026-12-02T16:29:00Z"))).toBe(false);
        expect(isReminderDue(startsAt, 60, new Date("2026-12-02T17:30:00Z"))).toBe(false);
        expect(isReminderDue(startsAt, 60, new Date("2026-12-02T18:00:00Z"))).toBe(false);
    });

    test("sem antecedência definida usa o padrão", () => {
        const justInside = new Date(startsAt.getTime() - DEFAULT_REMINDER_MINUTES * 60_000);
        expect(isReminderDue(startsAt, null, justInside)).toBe(true);
        expect(isReminderDue(startsAt, null, new Date(justInside.getTime() - 60_000))).toBe(false);
    });
});

describe("buildSessionReminder", () => {
    const base = {
        to: "paciente@teste.dev",
        psychologistName: "Ana Silva",
        startsAt: new Date("2026-12-02T17:30:00Z"),
        sessionType: "online",
        meetingUrl: "https://meet.example.com/abc?x=1&y=2",
    };

    test("traz psicóloga, data, hora no fuso de São Paulo, modalidade e link", () => {
        const { subject, text, html } = buildSessionReminder(base);
        expect(subject).toBe("Lembrete: sessão com Ana Silva em 02/12 às 14:30");
        expect(text).toContain("Data: quarta-feira, 2 de dezembro");
        expect(text).toContain("Horário: 14:30");
        expect(text).toContain("Modalidade: Online");
        expect(text).toContain("Link da teleconsulta: https://meet.example.com/abc?x=1&y=2");
        expect(html).toContain('href="https://meet.example.com/abc?x=1&amp;y=2"');
    });

    test("presencial não leva link e o nome é escapado", () => {
        const { subject, text, html } = buildSessionReminder({
            ...base,
            sessionType: "in_person",
            psychologistName: "Ana <b>Silva</b>\r\nBcc: x@y.z",
        });
        expect(text).toContain("Modalidade: Presencial");
        expect(text).not.toContain("Link");
        expect(html).not.toContain("href");
        expect(html).toContain("Ana &lt;b&gt;Silva&lt;/b&gt; Bcc: x@y.z");
        expect(subject).not.toContain("\n");
    });
});
