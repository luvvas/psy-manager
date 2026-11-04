/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import {
    type TestUser,
    appointmentInput,
    createPatient,
    db,
    expectTrpcError,
    jsonResponse,
    localDate,
    signUp,
    withFetch,
} from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

async function issueState(user: TestUser) {
    const { url } = await user.caller.appointment.getGoogleAuthUrl();
    const parsed = new URL(url);
    expect(parsed.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/calendar.readonly");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    return parsed.searchParams.get("state")!;
}

function tokenResponse(refresh?: string) {
    return () => jsonResponse({ access_token: "access-1", expires_in: 3600, ...(refresh ? { refresh_token: refresh } : {}) });
}

async function connect(user: TestUser, refresh = "refresh-1") {
    const state = await issueState(user);
    await withFetch(tokenResponse(refresh), () => user.caller.appointment.connectGoogleCalendar({ code: "code", state }));
}

function eventAt(id: string, summary: string, day: Date, start: string, end: string) {
    const iso = (hhmm: string) => {
        const d = new Date(day);
        const [h, m] = hhmm.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
    };
    return { id, summary, start: { dateTime: iso(start) }, end: { dateTime: iso(end) } };
}

function sync(user: TestUser, items: unknown[]) {
    return withFetch(
        (url) => {
            if (url.startsWith("https://www.googleapis.com/calendar/v3/")) return jsonResponse({ items });
            throw new Error(`fetch inesperado: ${url}`);
        },
        () => user.caller.appointment.syncGoogle()
    );
}

describe("Google Calendar: conexão OAuth", () => {
    it("state é de uso único", async () => {
        const ana = await signUp();
        const state = await issueState(ana);
        await withFetch(tokenResponse("r"), () => ana.caller.appointment.connectGoogleCalendar({ code: "c", state }));
        expect(await ana.caller.appointment.isConnectedGoogle()).toBe(true);
        await expectTrpcError(
            withFetch(tokenResponse("r"), () => ana.caller.appointment.connectGoogleCalendar({ code: "c", state })),
            "FORBIDDEN"
        );
    });

    it("state emitido para outra psicóloga é FORBIDDEN", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const state = await issueState(ana);
        await expectTrpcError(
            withFetch(tokenResponse("r"), () => bia.caller.appointment.connectGoogleCalendar({ code: "c", state })),
            "FORBIDDEN"
        );
        expect(await bia.caller.appointment.isConnectedGoogle()).toBe(false);
    });

    it("reconectar sem refresh token mantém o anterior", async () => {
        const ana = await signUp();
        await connect(ana, "refresh-original");
        const state = await issueState(ana);
        await withFetch(tokenResponse(), () => ana.caller.appointment.connectGoogleCalendar({ code: "c2", state }));
        const accounts = await rows(sql`select refresh_token from account where user_id = ${ana.id} and provider_id = 'google'`);
        expect(accounts.length).toBe(1);
        expect(accounts[0].refresh_token).toBe("refresh-original");
    });
});

describe("Google Calendar: sincronização", () => {
    it("importa eventos que citam paciente, ignora o resto e não duplica", async () => {
        const ana = await signUp();
        await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);
        const day = localDate(5);
        const items = [eventAt("g-1", "Sessão Joana Prado", day, "14:00", "14:50"), eventAt("g-2", "Dentista", day, "16:00", "17:00")];

        expect(await sync(ana, items)).toEqual({ imported: 1, skipped: 1 });
        const [imported] = await ana.caller.appointment.list();
        expect(imported.startTime).toBe("14:00");
        expect(imported.endTime).toBe("14:50");
        expect(imported.status).toBe("confirmed");
        expect(imported.patient?.nome).toBe("Joana Prado");

        expect(await sync(ana, items)).toEqual({ imported: 0, skipped: 2 });
        expect((await ana.caller.appointment.list()).length).toBe(1);
    });

    it("evento movido no Google reagenda a sessão existente", async () => {
        const ana = await signUp();
        await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);
        const day = localDate(5);
        await sync(ana, [eventAt("g-1", "Joana Prado", day, "14:00", "14:50")]);
        expect(await sync(ana, [eventAt("g-1", "Joana Prado", day, "15:00", "15:50")])).toEqual({ imported: 1, skipped: 0 });
        const list = await ana.caller.appointment.list();
        expect(list.length).toBe(1);
        expect(list[0].startTime).toBe("15:00");
    });

    it("editar a sessão importada no app preserva o vínculo com o Google e não duplica no próximo sync", async () => {
        const ana = await signUp();
        const p = await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);
        const day = localDate(5);
        const items = [eventAt("g-1", "Joana Prado", day, "14:00", "14:50")];
        await sync(ana, items);
        const [imported] = await ana.caller.appointment.list();

        await ana.caller.appointment.update({
            id: imported.id,
            ...appointmentInput(p, { date: imported.date, startTime: "14:00", endTime: "14:50", notes: "Editada no app" }),
        } as any);

        const [row] = await rows(sql`select google_event_id from appointment where id = ${imported.id}`);
        expect(row.google_event_id).toBe("g-1");
        expect(await sync(ana, items)).toEqual({ imported: 0, skipped: 1 });
        expect((await ana.caller.appointment.list()).length).toBe(1);
    });

    it("token vencido é renovado com o refresh token", async () => {
        const ana = await signUp();
        await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);
        await db.execute(sql`update account set access_token_expires_at = now() - interval '1 hour' where user_id = ${ana.id} and provider_id = 'google'`);

        const calls: string[] = [];
        await withFetch(
            (url) => {
                calls.push(url);
                if (url === "https://oauth2.googleapis.com/token") return jsonResponse({ access_token: "access-2", expires_in: 3600 });
                return jsonResponse({ items: [] });
            },
            () => ana.caller.appointment.syncGoogle()
        );
        expect(calls[0]).toBe("https://oauth2.googleapis.com/token");
        const [acc] = await rows(sql`select access_token from account where user_id = ${ana.id} and provider_id = 'google'`);
        expect(acc.access_token).toBe("access-2");
    });

    it("sincronizar sem conta conectada falha", async () => {
        const ana = await signUp();
        await expectTrpcError(ana.caller.appointment.syncGoogle(), "INTERNAL_SERVER_ERROR");
    });
});
