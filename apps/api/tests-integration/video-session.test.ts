/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import { anonymousCaller, createAppointment, createPatient, db, expectTrpcError, signUp } from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

const tokenFrom = (url: string) => url.split("/consulta/entrar/")[1];

describe("teleconsulta", () => {
    it("banco guarda só o hash do token; link público mostra só o primeiro nome", async () => {
        const ana = await signUp("Ana Beatriz Souza");
        const p = await createPatient(ana);
        const appointmentId = await createAppointment(ana, p);
        const session = await ana.caller.videoSession.create({ appointmentId });
        const token = tokenFrom(session.patientJoinUrl);
        expect(session.patientJoinUrl).toStartWith("http://localhost:5173/consulta/entrar/");
        expect(session.wsAuthToken.length).toBeGreaterThan(0);

        const [raw] = await rows(sql`select patient_token from video_session where id = ${session.sessionId}`);
        expect(raw.patient_token).not.toBe(token);
        expect(raw.patient_token).toBe(createHash("sha256").update(token).digest("hex"));

        const anon = await anonymousCaller();
        const validated = await anon.videoSession.validateToken({ token });
        expect(validated.sessionId).toBe(session.sessionId);
        expect(validated.psychologistName).toBe("Ana");
        expect(validated.iceServers).toEqual([{ urls: "stun:stun.l.google.com:19302" }]);
    });

    it("token desconhecido é NOT_FOUND; sessão encerrada ou expirada é PRECONDITION_FAILED", async () => {
        const ana = await signUp();
        const anon = await anonymousCaller();
        await expectTrpcError(anon.videoSession.validateToken({ token: "inventado" }), "NOT_FOUND");

        const ended = await ana.caller.videoSession.create({});
        await ana.caller.videoSession.end({ id: ended.sessionId });
        await expectTrpcError(anon.videoSession.validateToken({ token: tokenFrom(ended.patientJoinUrl) }), "PRECONDITION_FAILED");

        const expired = await ana.caller.videoSession.create({});
        await db.execute(sql`update video_session set expires_at = now() - interval '1 minute' where id = ${expired.sessionId}`);
        await expectTrpcError(anon.videoSession.validateToken({ token: tokenFrom(expired.patientJoinUrl) }), "PRECONDITION_FAILED");
    });

    it("outra psicóloga não lê nem encerra a sessão", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const session = await ana.caller.videoSession.create({});

        await expectTrpcError(bia.caller.videoSession.get({ id: session.sessionId }), "NOT_FOUND");
        expect(await bia.caller.videoSession.end({ id: session.sessionId })).toEqual({ success: true });
        expect((await ana.caller.videoSession.get({ id: session.sessionId })).status).toBe("pending");
    });

    it("não cria sessão para agendamento alheio", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const p = await createPatient(ana);
        const appointmentId = await createAppointment(ana, p);
        await expectTrpcError(bia.caller.videoSession.create({ appointmentId }), "FORBIDDEN");
    });
});
