/// <reference types="bun" />

import { expect } from "bun:test";
import { TRPCError } from "@trpc/server";
import { createApp } from "../../src/app";
import { appRouter } from "../../src/routes/router";
import { createCallerFactory } from "../../src/trpc/index";
import { createContext } from "../../src/trpc/context";
import { db } from "../../src/db";

export { db };

export const app = createApp();

const createCaller = createCallerFactory(appRouter);
export type Caller = ReturnType<typeof createCaller>;

let ipCounter = 0;
export function uniqueIp() {
    ipCounter++;
    return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

let emailCounter = 0;
export function uniqueEmail(prefix = "psi") {
    emailCounter++;
    return `${prefix}.${Date.now()}.${emailCounter}@teste.dev`;
}

export const PASSWORD = "Senha@Teste123";

export function authRequest(pathname: string, body: unknown, ip = uniqueIp(), extraHeaders: Record<string, string> = {}) {
    return app.fetch(
        new Request(`http://localhost:3001${pathname}`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                origin: "http://localhost:5173",
                "cf-connecting-ip": ip,
                ...extraHeaders,
            },
            body: JSON.stringify(body),
        })
    );
}

export function cookieFrom(response: Response) {
    return response.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
}

export type TestUser = {
    id: string;
    email: string;
    name: string;
    cookie: string;
    caller: Caller;
};

export async function callerForCookie(cookie: string): Promise<Caller> {
    return createCaller(await createContext({ headers: new Headers({ cookie }) }));
}

export async function anonymousCaller(): Promise<Caller> {
    return createCaller(await createContext({ headers: new Headers() }));
}

export async function signUp(name = "Ana Teste Silva"): Promise<TestUser> {
    const email = uniqueEmail();
    const response = await authRequest("/api/auth/sign-up/email", {
        name,
        email,
        password: PASSWORD,
        crp: "06/123456",
        phone: "(11) 99999-0000",
        city: "São Paulo",
    });
    if (response.status !== 200) {
        throw new Error(`sign-up falhou: ${response.status} ${await response.text()}`);
    }
    const body = (await response.json()) as { user: { id: string } };
    const cookie = cookieFrom(response);
    return { id: body.user.id, email, name, cookie, caller: await callerForCookie(cookie) };
}

export async function expectTrpcError(promise: Promise<unknown>, code: TRPCError["code"]) {
    let caught: unknown;
    try {
        await promise;
    } catch (err) {
        caught = err;
    }
    expect(caught).toBeInstanceOf(TRPCError);
    expect((caught as TRPCError).code).toBe(code);
    return caught as TRPCError;
}

export async function expectRejects(promise: Promise<unknown>) {
    let caught: unknown;
    try {
        await promise;
    } catch (err) {
        caught = err;
    }
    expect(caught).toBeDefined();
    return caught;
}

export async function withFetch<T>(
    handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
    fn: () => Promise<T>
): Promise<T> {
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
        handler(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, init)) as typeof fetch;
    try {
        return await fn();
    } finally {
        globalThis.fetch = original;
    }
}

export function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function localDate(offsetDays: number) {
    const d = new Date(Date.now() + offsetDays * DAY_MS);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function nextWeekday(weekday: number, minOffset = 2) {
    for (let i = minOffset; i < minOffset + 7; i++) {
        const d = localDate(i);
        if (d.getDay() === weekday) return d;
    }
    throw new Error("unreachable");
}

export const FULL_WEEK_SCHEDULE = {
    sessionMinutes: 50,
    bufferMinutes: 10,
    days: Array.from({ length: 7 }, () => [{ start: "08:00", end: "18:00" }]),
};

export async function createPatient(user: TestUser, overrides: Record<string, unknown> = {}) {
    const { id } = await user.caller.patient.create({ nome: "Paciente Teste", ...overrides } as any);
    return id;
}

export function appointmentInput(patientId: string, overrides: Record<string, unknown> = {}) {
    return {
        patientId,
        date: localDate(3),
        startTime: "10:00",
        endTime: "10:50",
        status: "confirmed",
        sessionType: "in_person" as const,
        type: "individual" as const,
        isRecurring: false,
        ...overrides,
    };
}

export async function createAppointment(user: TestUser, patientId: string, overrides: Record<string, unknown> = {}) {
    const { id } = await user.caller.appointment.create(appointmentInput(patientId, overrides) as any);
    return id;
}

export const CLINIC_INPUT = {
    name: "Clínica Teste",
    cnpj: "12.345.678/0001-90",
    phone: "(11) 3333-0000",
    email: "contato@clinica.dev",
    address: "Rua Teste, 100",
    city: "São Paulo",
};

export async function sharedClinic(owner: TestUser, member: TestUser) {
    const clinic = await owner.caller.clinic.create(CLINIC_INPUT);
    const room = await owner.caller.clinic.addRoom({ clinicId: clinic.id, name: "Sala 1" });
    await owner.caller.clinic.linkPsychologist({ clinicId: clinic.id, psychologistEmail: member.email });
    await member.caller.clinic.acceptInvite({ clinicId: clinic.id });
    return { clinicId: clinic.id, roomId: room!.id };
}

export const PDF_BYTES = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

export async function uploadPdf(user: TestUser, kind: "document" | "clinicalRecord" = "document") {
    const target = await user.caller[kind].prepareUpload({
        fileName: "laudo.pdf",
        contentType: "application/pdf",
        fileSize: PDF_BYTES.length,
    });
    const response = await app.fetch(
        new Request(`http://localhost:3001${target.uploadUrl}`, {
            method: "PUT",
            headers: { "content-type": "application/pdf", "content-length": String(PDF_BYTES.length) },
            body: PDF_BYTES,
        })
    );
    return { target, response };
}

export function get(pathname: string) {
    return app.fetch(new Request(`http://localhost:3001${pathname}`));
}
