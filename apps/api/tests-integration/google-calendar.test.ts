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
import { decryptField } from "../src/lib/encryption";
import { localDay } from "../src/lib/work-schedule";

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

function eventAt(id: string, summary: string, day: Date, start: string, end: string, extra: Record<string, unknown> = {}) {
    const iso = (hhmm: string) => {
        const d = new Date(day);
        const [h, m] = hhmm.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
    };
    return { id, summary, start: { dateTime: iso(start) }, end: { dateTime: iso(end) }, ...extra };
}

function calendarFetch(items: unknown[]) {
    return (url: string) => {
        if (url.startsWith("https://www.googleapis.com/calendar/v3/")) return jsonResponse({ items });
        throw new Error(`fetch inesperado: ${url}`);
    };
}

function sync(user: TestUser, items: unknown[]) {
    return withFetch(calendarFetch(items), () => user.caller.appointment.syncGoogle());
}

function resolve(user: TestUser, items: unknown[], decisions: { key: string; patientId?: string | null; newPatientName?: string }[]) {
    return withFetch(calendarFetch(items), () => user.caller.appointment.resolveGoogleEvents({ decisions }));
}

function weekly(seriesId: string, summary: string, weeks: number[], start = "14:00", end = "14:50") {
    return weeks.map((w) => eventAt(`${seriesId}_${w}`, summary, localDate(2 + w * 7), start, end, { recurringEventId: seriesId }));
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
        expect(decryptField(accounts[0].refresh_token)).toBe("refresh-original");
    });

    it("tokens ficam cifrados no banco", async () => {
        const ana = await signUp();
        await connect(ana, "refresh-secreto");
        const [acc] = await rows(sql`select access_token, refresh_token from account where user_id = ${ana.id} and provider_id = 'google'`);
        expect(acc.access_token).not.toBe("access-1");
        expect(acc.refresh_token).not.toContain("refresh-secreto");
        expect(acc.access_token.startsWith("v1:")).toBe(true);
        expect(decryptField(acc.access_token)).toBe("access-1");
    });

    it("tokens antigos em texto puro continuam funcionando", async () => {
        const ana = await signUp();
        await connect(ana);
        await db.execute(sql`update account set access_token = 'legado' where user_id = ${ana.id} and provider_id = 'google'`);
        let auth = "";
        await withFetch(
            (url, init) => {
                auth = new Headers(init?.headers).get("authorization") ?? "";
                return calendarFetch([])(url);
            },
            () => ana.caller.appointment.syncGoogle()
        );
        expect(auth).toBe("Bearer legado");
    });

    it("desconectar revoga no Google e apaga tokens e vínculos", async () => {
        const ana = await signUp();
        const p = await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana, "refresh-1");
        await resolve(ana, [], [{ key: "serie-1", patientId: p }]);

        const calls: { url: string; body: string }[] = [];
        await withFetch(
            (url, init) => {
                calls.push({ url, body: String(init?.body ?? "") });
                return new Response(null, { status: 200 });
            },
            () => ana.caller.appointment.disconnectGoogle()
        );

        expect(calls[0].url).toBe("https://oauth2.googleapis.com/revoke");
        expect(calls[0].body).toBe("token=refresh-1");
        expect(await ana.caller.appointment.isConnectedGoogle()).toBe(false);
        expect((await rows(sql`select 1 from google_event_link where psychologist_id = ${ana.id}`)).length).toBe(0);
    });

    it("desconectar funciona mesmo se o Google recusar a revogação", async () => {
        const ana = await signUp();
        await connect(ana);
        await withFetch(() => new Response(null, { status: 400 }), () => ana.caller.appointment.disconnectGoogle());
        expect(await ana.caller.appointment.isConnectedGoogle()).toBe(false);
    });
});

describe("Google Calendar: sincronização com revisão", () => {
    it("nada é importado sem decisão; eventos viram pendentes agrupados por série, com sugestão", async () => {
        const ana = await signUp();
        const joana = await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);
        const items = [
            ...weekly("serie-joana", "Sessão Joana Prado", [0, 1, 2]),
            eventAt("dentista", "Dentista", localDate(4), "16:00", "17:00"),
        ];

        const result = await sync(ana, items);
        expect(result.imported).toBe(0);
        expect(result.pending.length).toBe(2);
        const serie = result.pending.find((p) => p.key === "serie-joana")!;
        expect(serie.occurrences).toBe(3);
        expect(serie.recurring).toBe(true);
        expect(serie.startTime).toBe("14:00");
        expect(serie.suggestedPatientId).toBe(joana);
        expect(result.pending.find((p) => p.key === "dentista")!.suggestedPatientId).toBeNull();
        expect((await ana.caller.appointment.list()).length).toBe(0);
    });

    it("sugestão ignora acentos e caixa e prefere o nome mais longo", async () => {
        const ana = await signUp();
        await createPatient(ana, { nome: "Ana" });
        const anaClara = await createPatient(ana, { nome: "Ana Clara Simões" });
        await connect(ana);
        const result = await sync(ana, [eventAt("e1", "sessão ANA CLARA SIMOES", localDate(3), "10:00", "10:50")]);
        expect(result.pending[0].suggestedPatientId).toBe(anaClara);
    });

    it("vincular a série importa todas as ocorrências, e as novas entram sozinhas depois", async () => {
        const ana = await signUp();
        const joana = await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);

        const result = await resolve(ana, weekly("serie-joana", "Joana", [0, 1]), [{ key: "serie-joana", patientId: joana }]);
        expect(result).toMatchObject({ imported: 2, pending: [] });
        const list = await ana.caller.appointment.list();
        expect(list.length).toBe(2);
        expect(list.every((a) => a.patientId === joana && a.startTime === "14:00" && a.status === "confirmed")).toBe(true);

        expect(await sync(ana, weekly("serie-joana", "Joana", [0, 1, 2]))).toMatchObject({ imported: 1, updated: 0, pending: [] });
        expect((await ana.caller.appointment.list()).length).toBe(3);
    });

    it("evento ignorado não volta para a revisão", async () => {
        const ana = await signUp();
        await connect(ana);
        const items = weekly("academia", "Academia", [0, 1]);
        expect(await resolve(ana, items, [{ key: "academia", patientId: null }])).toMatchObject({ imported: 0, pending: [] });
        expect(await sync(ana, weekly("academia", "Academia", [0, 1, 2]))).toMatchObject({ imported: 0, pending: [] });
        expect((await ana.caller.appointment.list()).length).toBe(0);
    });

    it("cadastra paciente nova a partir do evento", async () => {
        const ana = await signUp();
        await connect(ana);
        const items = weekly("serie-carol", "Carol", [0]);
        expect(await resolve(ana, items, [{ key: "serie-carol", newPatientName: "Carolina Reis" }])).toMatchObject({ imported: 1 });
        const [imported] = await ana.caller.appointment.list();
        expect(imported.patient?.nome).toBe("Carolina Reis");
        expect((await ana.caller.patient.list()).length).toBe(1);
    });

    it("não aceita paciente de outra psicóloga", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const daBia = await createPatient(bia, { nome: "Paciente da Bia" });
        await connect(ana);
        await expectTrpcError(resolve(ana, weekly("s", "x", [0]), [{ key: "s", patientId: daBia }]), "FORBIDDEN");
        expect((await rows(sql`select 1 from google_event_link where psychologist_id = ${ana.id}`)).length).toBe(0);
    });

    it("ignora eventos de dia inteiro e cancelados", async () => {
        const ana = await signUp();
        await connect(ana);
        const result = await sync(ana, [
            { id: "feriado", summary: "Feriado", start: { date: "2026-11-15" }, end: { date: "2026-11-16" } },
            { ...eventAt("cancelado", "Cancelado", localDate(3), "10:00", "11:00"), status: "cancelled" },
        ]);
        expect(result.pending).toEqual([]);
    });

    it("horário vem no fuso de São Paulo mesmo com o evento em UTC", async () => {
        const ana = await signUp();
        const joana = await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);
        const day = localDay(localDate(3)).key;
        const item = { id: "utc", summary: "Joana", start: { dateTime: `${day}T17:00:00Z` }, end: { dateTime: `${day}T17:50:00Z` } };
        expect(await resolve(ana, [item], [{ key: "utc", patientId: joana }])).toMatchObject({ imported: 1 });
        const [imported] = await ana.caller.appointment.list();
        expect(imported.startTime).toBe("14:00");
        expect(imported.endTime).toBe("14:50");
    });

    it("evento movido no Google reagenda a sessão existente", async () => {
        const ana = await signUp();
        const joana = await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);
        const day = localDate(5);
        await resolve(ana, [eventAt("g-1", "Joana Prado", day, "14:00", "14:50")], [{ key: "g-1", patientId: joana }]);
        expect(await sync(ana, [eventAt("g-1", "Joana Prado", day, "15:00", "15:50")])).toMatchObject({ imported: 0, updated: 1 });
        const list = await ana.caller.appointment.list();
        expect(list.length).toBe(1);
        expect(list[0].startTime).toBe("15:00");
    });

    it("sessão importada antes dos vínculos cria o vínculo da série no próximo sync", async () => {
        const ana = await signUp();
        const joana = await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);
        await resolve(ana, weekly("serie", "Joana", [0]), [{ key: "serie", patientId: joana }]);
        await db.execute(sql`delete from google_event_link where psychologist_id = ${ana.id}`);

        expect(await sync(ana, weekly("serie", "Joana", [0, 1]))).toMatchObject({ imported: 1, pending: [] });
        expect((await ana.caller.appointment.list()).length).toBe(2);
    });

    it("editar a sessão importada no app preserva o vínculo com o Google e não duplica no próximo sync", async () => {
        const ana = await signUp();
        const p = await createPatient(ana, { nome: "Joana Prado" });
        await connect(ana);
        const day = localDate(5);
        const items = [eventAt("g-1", "Joana Prado", day, "14:00", "14:50")];
        await resolve(ana, items, [{ key: "g-1", patientId: p }]);
        const [imported] = await ana.caller.appointment.list();

        await ana.caller.appointment.update({
            id: imported.id,
            ...appointmentInput(p, { date: imported.date, startTime: "14:00", endTime: "14:50", notes: "Editada no app" }),
        } as any);

        const [row] = await rows(sql`select google_event_id from appointment where id = ${imported.id}`);
        expect(row.google_event_id).toBe("g-1");
        expect(await sync(ana, items)).toMatchObject({ imported: 0, updated: 0, pending: [] });
        expect((await ana.caller.appointment.list()).length).toBe(1);
    });

    it("token vencido é renovado com o refresh token e gravado cifrado", async () => {
        const ana = await signUp();
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
        expect(acc.access_token).not.toBe("access-2");
        expect(decryptField(acc.access_token)).toBe("access-2");
    });

    it("janela de leitura segue a configuração do perfil (padrão 30 para trás e 90 para frente)", async () => {
        const ana = await signUp();
        await connect(ana);
        const windowDays = async () => {
            let requested = "";
            await withFetch(
                (url) => {
                    requested = url;
                    return jsonResponse({ items: [] });
                },
                () => ana.caller.appointment.syncGoogle()
            );
            const params = new URL(requested).searchParams;
            const days = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
            return [days(params.get("timeMin")!), days(params.get("timeMax")!)];
        };

        expect(await windowDays()).toEqual([-30, 90]);
        await ana.caller.psychologist.updateProfile({ googleSyncDaysBack: 7, googleSyncDaysAhead: 180 });
        expect(await windowDays()).toEqual([-7, 180]);
        await expectTrpcError(ana.caller.psychologist.updateProfile({ googleSyncDaysAhead: 0 }), "BAD_REQUEST");
    });

    it("sincronizar sem conta conectada pede para conectar", async () => {
        const ana = await signUp();
        await expectTrpcError(ana.caller.appointment.syncGoogle(), "PRECONDITION_FAILED");
    });
});
