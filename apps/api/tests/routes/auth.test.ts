/// <reference types="bun" />

import { beforeEach, describe, expect, test } from "bun:test";
import { anonymousCaller, resetRouterTestState } from "../utils/router-test-utils";

beforeEach(resetRouterTestState);

describe("app router protection", () => {
    test("blocks all major query procedures without a session", async () => {
        const anon = anonymousCaller();

        await Promise.all([
            expect(anon.patient.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.psychologist.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.psychologist.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.appointment.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.appointment.isConnectedGoogle()).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.appointment.getGoogleAuthUrl()).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.clinic.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.document.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.videoSession.get({ id: "video-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
        ]);
    });

    test("blocks all major mutation procedures without a session", async () => {
        const anon = anonymousCaller();

        await Promise.all([
            expect(
                anon.patient.create({ nome: "x", email: "x@x.com", telefone: "1", dataNascimento: "2000-01-01", cidade: "x", cpf: "x" })
            ).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.patient.delete({ id: "patient-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.appointment.syncGoogle()).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.appointment.connectGoogleCalendar({ code: "oauth-code" })).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.videoSession.create({ patientId: "patient-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.videoSession.end({ id: "video-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
            expect(anon.clinic.create({ name: "x", cnpj: "x", phone: "x", email: "x@x.com", address: "x", city: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" }),
        ]);
    });
});
