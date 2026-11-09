/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { rolloutBucket } from "../src/services/feature-flag.service";
import { dueDateFor } from "../src/services/billing.service";
import {
    type TestUser,
    appointmentInput,
    createAppointment,
    createPatient,
    db,
    expectTrpcError,
    localDate,
    signUp,
} from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

async function enablePayments(user: TestUser, enabled = true) {
    await db.execute(
        sql`insert into feature_flag_override (id, flag_key, psychologist_id, enabled)
            values (${crypto.randomUUID()}, 'pagamentos', ${user.id}, ${enabled})
            on conflict (flag_key, psychologist_id) do update set enabled = excluded.enabled`
    );
}

async function withGlobalFlag<T>(enabled: boolean, rolloutPercent: number, fn: () => Promise<T>) {
    await db.execute(sql`update feature_flag set enabled = ${enabled}, rollout_percent = ${rolloutPercent} where key = 'pagamentos'`);
    try {
        return await fn();
    } finally {
        await db.execute(sql`update feature_flag set enabled = false, rollout_percent = 0 where key = 'pagamentos'`);
    }
}

async function billedUser(name = "Ana Cobranca") {
    const user = await signUp(name);
    await enablePayments(user);
    return user;
}

async function completedSession(user: TestUser, patientId: string, overrides: Record<string, unknown> = {}) {
    return createAppointment(user, patientId, { status: "completed", allowScheduleConflicts: true, ...overrides });
}

describe("feature flags", () => {
    it("pagamentos nasce desligada: lista false e a API recusa", async () => {
        const ana = await signUp();
        expect(await ana.caller.featureFlags.list()).toEqual({ pagamentos: false });
        await expectTrpcError(ana.caller.billing.summary(), "FORBIDDEN");
    });

    it("override ligado libera só a própria psicóloga", async () => {
        const ana = await signUp();
        const bia = await signUp();
        await enablePayments(ana);
        expect(await ana.caller.featureFlags.list()).toEqual({ pagamentos: true });
        await ana.caller.billing.summary();
        await expectTrpcError(bia.caller.billing.summary(), "FORBIDDEN");
    });

    it("override desligado vence a flag ligada para todas", async () => {
        const ana = await signUp();
        const bia = await signUp();
        await enablePayments(bia, false);
        await withGlobalFlag(true, 0, async () => {
            expect((await ana.caller.featureFlags.list()).pagamentos).toBe(true);
            expect((await bia.caller.featureFlags.list()).pagamentos).toBe(false);
        });
    });

    it("porcentagem usa um bucket estável por psicóloga", async () => {
        const ana = await signUp();
        const bucket = rolloutBucket("pagamentos", ana.id);
        expect(rolloutBucket("pagamentos", ana.id)).toBe(bucket);
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThan(100);
        await withGlobalFlag(false, bucket + 1, async () => {
            expect((await ana.caller.featureFlags.list()).pagamentos).toBe(true);
        });
        await withGlobalFlag(false, bucket, async () => {
            expect((await ana.caller.featureFlags.list()).pagamentos).toBe(false);
        });
    });
});

describe("cobranças geradas pela agenda", () => {
    it("sessão concluída gera cobrança no valor do paciente; sem valor não gera", async () => {
        const ana = await billedUser();
        const comValor = await createPatient(ana, { nome: "Joana Paga", valorSessao: "200" });
        const semValor = await createPatient(ana, { nome: "Sem Valor" });
        await completedSession(ana, comValor);
        await completedSession(ana, semValor, { startTime: "14:00", endTime: "14:50" });

        const statement = await ana.caller.billing.patientStatement({ patientId: comValor });
        expect(statement.charges.map((c) => [c.amount, c.status])).toEqual([[200, "open"]]);
        expect((await ana.caller.billing.patientStatement({ patientId: semValor })).charges).toEqual([]);
    });

    it("sessão confirmada não gera; ao concluir gera; ao voltar para confirmada a cobrança aberta some", async () => {
        const ana = await billedUser();
        const p = await createPatient(ana, { valorSessao: 150 });
        const id = await createAppointment(ana, p);
        expect((await ana.caller.billing.patientStatement({ patientId: p })).charges).toEqual([]);

        await ana.caller.appointment.update({ id, ...appointmentInput(p, { status: "completed" }) } as any);
        expect((await ana.caller.billing.patientStatement({ patientId: p })).charges.length).toBe(1);

        await ana.caller.appointment.update({ id, ...appointmentInput(p, { status: "completed", notes: "editada" }) } as any);
        expect((await ana.caller.billing.patientStatement({ patientId: p })).charges.length).toBe(1);

        await ana.caller.appointment.update({ id, ...appointmentInput(p, { status: "confirmed" }) } as any);
        expect((await ana.caller.billing.patientStatement({ patientId: p })).charges).toEqual([]);
    });

    it("excluir a sessão apaga a cobrança aberta, mas a paga continua", async () => {
        const ana = await billedUser();
        const p = await createPatient(ana, { valorSessao: 100 });
        const aberta = await completedSession(ana, p, { startTime: "09:00", endTime: "09:50" });
        const paga = await completedSession(ana, p, { startTime: "11:00", endTime: "11:50" });
        const { charges } = await ana.caller.billing.patientStatement({ patientId: p });
        const chargeOfPaga = charges.find((c) => c.appointmentId === paga)!;
        await ana.caller.billing.registerPayment({ patientId: p, chargeIds: [chargeOfPaga.id], paidAt: new Date(), method: "pix" });

        await ana.caller.appointment.delete({ id: aberta });
        await ana.caller.appointment.delete({ id: paga });

        const after = (await ana.caller.billing.patientStatement({ patientId: p })).charges;
        expect(after.map((c) => [c.status, c.appointmentId])).toEqual([["paid", null]]);
    });

    it("vencimento: avulsa vence no dia da sessão; mensal no dia 10 do mês seguinte", () => {
        const session = new Date("2026-10-20T15:00:00-03:00");
        expect(dueDateFor("sessao_avulsa", session).toISOString()).toBe("2026-10-20T03:00:00.000Z");
        expect(dueDateFor("mensal", session).toISOString()).toBe("2026-11-10T03:00:00.000Z");
        expect(dueDateFor("mensal", new Date("2026-12-31T22:00:00-03:00")).toISOString()).toBe("2027-01-10T03:00:00.000Z");
    });
});

describe("contas a receber e pagamentos", () => {
    it("resumo e lista por paciente somam o que está em aberto e o que venceu", async () => {
        const ana = await billedUser();
        const joana = await createPatient(ana, { nome: "Joana Devedora", valorSessao: 200, telefone: "(11) 98888-0000" });
        const carlos = await createPatient(ana, { nome: "Carlos Em Dia", valorSessao: 100, modeloCobranca: "mensal" });
        await completedSession(ana, joana, { date: localDate(-10) });
        await completedSession(ana, joana, { date: localDate(-3) });
        await completedSession(ana, carlos, { date: localDate(-1) });

        const summary = await ana.caller.billing.summary();
        expect(summary).toEqual({ toReceive: 500, overdue: 400, receivedThisMonth: 0, patientsWithBalance: 2 });

        const list = await ana.caller.billing.receivables();
        expect(list.map((r) => [r.nome, r.openCount, r.total, r.overdueTotal])).toEqual([
            ["Joana Devedora", 2, 400, 400],
            ["Carlos Em Dia", 1, 100, 0],
        ]);
        expect(list[0].telefone).toBe("(11) 98888-0000");
    });

    it("registrar pagamento quita as cobranças e cria a receita paga no Financeiro", async () => {
        const ana = await billedUser();
        const p = await createPatient(ana, { nome: "Paga Tudo", valorSessao: 180 });
        await completedSession(ana, p, { startTime: "08:00", endTime: "08:50" });
        await completedSession(ana, p, { startTime: "09:00", endTime: "09:50" });
        const ids = (await ana.caller.billing.patientStatement({ patientId: p })).charges.map((c) => c.id);

        const result = await ana.caller.billing.registerPayment({ patientId: p, chargeIds: ids, paidAt: new Date(), method: "pix" });
        expect(result.amount).toBe(360);

        const statement = await ana.caller.billing.patientStatement({ patientId: p });
        expect(statement.charges.every((c) => c.status === "paid" && c.paymentId === result.paymentId)).toBe(true);
        expect(statement.payments.map((x) => [x.amount, x.method])).toEqual([[360, "pix"]]);

        const [tx] = await ana.caller.financial.list();
        expect(tx.id).toBe(result.financialTransactionId);
        expect([tx.type, tx.status, Number(tx.amount), tx.patientId, tx.description]).toEqual([
            "income",
            "paid",
            360,
            p,
            "Pagamento de 2 sessões",
        ]);
        const [raw] = await rows(sql`select description from financial_transaction where id = ${tx.id}`);
        expect(raw.description).toStartWith("v1:");

        const summary = await ana.caller.billing.summary();
        expect(summary.toReceive).toBe(0);
        expect(summary.receivedThisMonth).toBe(360);
        expect(await ana.caller.billing.receivables()).toEqual([]);
    });

    it("cobrança já paga não pode ser paga de novo e o lote é tudo ou nada", async () => {
        const ana = await billedUser();
        const p = await createPatient(ana, { valorSessao: 100 });
        await completedSession(ana, p, { startTime: "08:00", endTime: "08:50" });
        await completedSession(ana, p, { startTime: "09:00", endTime: "09:50" });
        const [first, second] = (await ana.caller.billing.patientStatement({ patientId: p })).charges.map((c) => c.id);
        await ana.caller.billing.registerPayment({ patientId: p, chargeIds: [first], paidAt: new Date(), method: "dinheiro" });

        await expectTrpcError(
            ana.caller.billing.registerPayment({ patientId: p, chargeIds: [first, second], paidAt: new Date(), method: "pix" }),
            "BAD_REQUEST"
        );
        const statement = await ana.caller.billing.patientStatement({ patientId: p });
        expect(statement.charges.find((c) => c.id === second)?.status).toBe("open");
        expect(statement.payments.length).toBe(1);
        expect((await ana.caller.financial.list()).length).toBe(1);
    });

    it("abonar tira a cobrança de A receber", async () => {
        const ana = await billedUser();
        const p = await createPatient(ana, { valorSessao: 100 });
        await completedSession(ana, p);
        const [c] = (await ana.caller.billing.patientStatement({ patientId: p })).charges;
        await ana.caller.billing.waiveCharge({ chargeId: c.id });
        expect((await ana.caller.billing.summary()).toReceive).toBe(0);
        await expectTrpcError(ana.caller.billing.waiveCharge({ chargeId: c.id }), "NOT_FOUND");
    });

    it("outra psicóloga não lê, não paga e não abona cobranças alheias", async () => {
        const ana = await billedUser();
        const bia = await billedUser("Bia Curiosa");
        const p = await createPatient(ana, { valorSessao: 100 });
        await completedSession(ana, p);
        const [c] = (await ana.caller.billing.patientStatement({ patientId: p })).charges;

        expect(await bia.caller.billing.receivables()).toEqual([]);
        await expectTrpcError(bia.caller.billing.patientStatement({ patientId: p }), "NOT_FOUND");
        await expectTrpcError(
            bia.caller.billing.registerPayment({ patientId: p, chargeIds: [c.id], paidAt: new Date(), method: "pix" }),
            "FORBIDDEN"
        );
        const bPatient = await createPatient(bia, { valorSessao: 100 });
        await expectTrpcError(
            bia.caller.billing.registerPayment({ patientId: bPatient, chargeIds: [c.id], paidAt: new Date(), method: "pix" }),
            "BAD_REQUEST"
        );
        await expectTrpcError(bia.caller.billing.waiveCharge({ chargeId: c.id }), "NOT_FOUND");
        expect((await ana.caller.billing.patientStatement({ patientId: p })).charges[0].status).toBe("open");
    });

    it("desfazer pagamento reabre as cobranças e apaga a receita e o pagamento", async () => {
        const ana = await billedUser();
        const p = await createPatient(ana, { valorSessao: 120 });
        await completedSession(ana, p, { startTime: "08:00", endTime: "08:50" });
        await completedSession(ana, p, { startTime: "09:00", endTime: "09:50" });
        const ids = (await ana.caller.billing.patientStatement({ patientId: p })).charges.map((c) => c.id);
        const { paymentId, financialTransactionId } = await ana.caller.billing.registerPayment({
            patientId: p,
            chargeIds: ids,
            paidAt: new Date(),
            method: "pix",
        });

        await ana.caller.billing.undoPayment({ paymentId });

        const statement = await ana.caller.billing.patientStatement({ patientId: p });
        expect(statement.charges.map((c) => [c.status, c.paidAt, c.paymentId])).toEqual([
            ["open", null, null],
            ["open", null, null],
        ]);
        expect(statement.payments).toEqual([]);
        expect((await ana.caller.financial.list()).find((t) => t.id === financialTransactionId)).toBeUndefined();
        expect((await ana.caller.billing.summary()).toReceive).toBe(240);
        await expectTrpcError(ana.caller.billing.undoPayment({ paymentId }), "NOT_FOUND");
    });

    it("desfazer não ressuscita cobrança de sessão que deixou de estar concluída", async () => {
        const ana = await billedUser();
        const p = await createPatient(ana, { valorSessao: 100 });
        const id = await completedSession(ana, p);
        const [c] = (await ana.caller.billing.patientStatement({ patientId: p })).charges;
        const { paymentId } = await ana.caller.billing.registerPayment({ patientId: p, chargeIds: [c.id], paidAt: new Date(), method: "pix" });
        await ana.caller.appointment.update({ id, ...appointmentInput(p, { status: "confirmed" }) } as any);

        await ana.caller.billing.undoPayment({ paymentId });
        expect((await ana.caller.billing.patientStatement({ patientId: p })).charges).toEqual([]);
    });

    it("outra psicóloga não desfaz pagamento alheio", async () => {
        const ana = await billedUser();
        const bia = await billedUser("Bia Curiosa");
        const p = await createPatient(ana, { valorSessao: 100 });
        await completedSession(ana, p);
        const [c] = (await ana.caller.billing.patientStatement({ patientId: p })).charges;
        const { paymentId } = await ana.caller.billing.registerPayment({ patientId: p, chargeIds: [c.id], paidAt: new Date(), method: "pix" });
        await expectTrpcError(bia.caller.billing.undoPayment({ paymentId }), "NOT_FOUND");
        expect((await ana.caller.billing.patientStatement({ patientId: p })).payments.length).toBe(1);
    });

    it("receita gerada por pagamento não pode ser apagada nem ter valor alterado no Financeiro", async () => {
        const ana = await billedUser();
        const p = await createPatient(ana, { valorSessao: 100 });
        await completedSession(ana, p);
        const [c] = (await ana.caller.billing.patientStatement({ patientId: p })).charges;
        const { financialTransactionId: txId } = await ana.caller.billing.registerPayment({
            patientId: p,
            chargeIds: [c.id],
            paidAt: new Date(),
            method: "pix",
        });

        const err = await expectTrpcError(ana.caller.financial.delete({ id: txId }), "BAD_REQUEST");
        expect(err.message).toContain("desfaça o pagamento");
        await expectTrpcError(ana.caller.financial.update({ id: txId, amount: 50 }), "BAD_REQUEST");
        await expectTrpcError(ana.caller.financial.update({ id: txId, status: "pending" }), "BAD_REQUEST");

        await ana.caller.financial.update({ id: txId, type: "income", amount: "100.00", category: "Psicoterapia", patientId: p });
        const [tx] = await ana.caller.financial.list();
        expect(tx.category).toBe("Psicoterapia");

        const avulsa = await ana.caller.financial.create({ type: "income", description: "avulsa", amount: 10, date: new Date() });
        await ana.caller.financial.delete({ id: avulsa.id });
    });

    it("exportação de dados inclui cobranças e pagamentos", async () => {
        const ana = await billedUser();
        const p = await createPatient(ana, { valorSessao: 100 });
        await completedSession(ana, p, { startTime: "08:00", endTime: "08:50" });
        await completedSession(ana, p, { startTime: "09:00", endTime: "09:50" });
        const [first] = (await ana.caller.billing.patientStatement({ patientId: p })).charges;
        await ana.caller.billing.registerPayment({ patientId: p, chargeIds: [first.id], paidAt: new Date(), method: "dinheiro" });

        const exported = await ana.caller.psychologist.exportData();
        expect(exported.charges.map((c) => c.status).sort()).toEqual(["open", "paid"]);
        expect(exported.charges.every((c) => c.amount === 100 && c.patientId === p)).toBe(true);
        expect(exported.payments.map((x) => [x.amount, x.method])).toEqual([[100, "dinheiro"]]);
    });

    it("CPF da psicóloga fica cifrado no banco; endereço e UF salvos; nada some em outras edições", async () => {
        const ana = await signUp();
        await ana.caller.psychologist.updateProfile({
            cpf: "529.982.247-25",
            addressZip: "01310-100",
            addressStreet: "Av. Paulista",
            addressNumber: "1000",
            addressComplement: "Sala 12",
            addressDistrict: "Bela Vista",
            state: "sp",
        });
        await ana.caller.psychologist.updateProfile({ city: "São Paulo" });

        const me = await ana.caller.psychologist.me();
        expect(me?.cpf).toBe("52998224725");
        expect([me?.addressStreet, me?.addressNumber, me?.state, me?.city]).toEqual(["Av. Paulista", "1000", "SP", "São Paulo"]);
        const [raw] = await rows(sql`select cpf from "user" where id = ${ana.id}`);
        expect(raw.cpf).toStartWith("v1:");

        const exported = await ana.caller.psychologist.exportData();
        expect(exported.psychologist.cpf).toBe("52998224725");
        expect(exported.psychologist.address?.district).toBe("Bela Vista");

        await expectTrpcError(ana.caller.psychologist.updateProfile({ cpf: "123" }), "BAD_REQUEST");
        await expectTrpcError(ana.caller.psychologist.updateProfile({ state: "São" }), "BAD_REQUEST");
        await ana.caller.psychologist.updateProfile({ cpf: "" });
        expect((await ana.caller.psychologist.me())?.cpf).toBeNull();
    });

    it("chave Pix fica no perfil e não é apagada por outras edições", async () => {
        const ana = await signUp();
        await ana.caller.psychologist.updateProfile({ pixKey: "ana@pix.dev" });
        await ana.caller.psychologist.updateProfile({ city: "Santos" });
        expect((await ana.caller.psychologist.me())?.pixKey).toBe("ana@pix.dev");
        await ana.caller.psychologist.updateProfile({ pixKey: "" });
        expect((await ana.caller.psychologist.me())?.pixKey).toBeNull();
    });
});
