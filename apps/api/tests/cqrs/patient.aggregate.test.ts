/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { PatientAggregate } from "../../src/cqrs/patient/patient.aggregate";

function baseData() {
    return {
        id: "patient-1",
        nome: "Ana Silva",
        email: "ana@example.com",
        telefone: "11999999999",
        dataNascimento: new Date("1990-01-01"),
        cidade: "São Paulo",
        cpf: "12345678900",
        psychologistId: "psych-1",
    };
}

describe("PatientAggregate", () => {
    test("raises PATIENT_CREATED and reflects state after create", () => {
        const agg = new PatientAggregate();
        agg.create(baseData());

        expect(agg.uncommittedEvents).toHaveLength(1);
        const event = agg.uncommittedEvents[0];
        expect(event.type).toBe("PATIENT_CREATED");
        expect(event.version).toBe(1);
        expect(event.aggregateId).toBe("patient-1");
        expect(agg.state.nome).toBe("Ana Silva");
        expect(agg.state.psychologistId).toBe("psych-1");
        expect(agg.state.isDeleted).toBe(false);
        expect(agg.version).toBe(1);
    });

    test("raises PATIENT_UPDATED and merges changed fields", () => {
        const agg = new PatientAggregate();
        agg.create(baseData());
        agg.clearUncommittedEvents();

        agg.update({ ...baseData(), nome: "Ana Costa" });

        expect(agg.uncommittedEvents).toHaveLength(1);
        expect(agg.uncommittedEvents[0].type).toBe("PATIENT_UPDATED");
        expect(agg.state.nome).toBe("Ana Costa");
        expect(agg.state.psychologistId).toBe("psych-1");
        expect(agg.version).toBe(2);
    });

    test("raises PATIENT_DELETED and sets isDeleted", () => {
        const agg = new PatientAggregate();
        agg.create(baseData());
        agg.clearUncommittedEvents();
        agg.delete();

        expect(agg.uncommittedEvents[0].type).toBe("PATIENT_DELETED");
        expect(agg.state.isDeleted).toBe(true);
        expect(agg.version).toBe(2);
    });

    test("rebuilds identical state from history via loadFromHistory", () => {
        const source = new PatientAggregate();
        source.create(baseData());
        source.update({ ...baseData(), nome: "Ana Costa" });
        const events = [...source.uncommittedEvents];

        const replayed = new PatientAggregate();
        replayed.loadFromHistory(events);

        expect(replayed.state.nome).toBe("Ana Costa");
        expect(replayed.state.isDeleted).toBe(false);
        expect(replayed.version).toBe(2);
        expect(replayed.uncommittedEvents).toHaveLength(0);
    });

    test("rebuilds deleted state from history", () => {
        const source = new PatientAggregate();
        source.create(baseData());
        source.delete();
        const events = [...source.uncommittedEvents];

        const replayed = new PatientAggregate();
        replayed.loadFromHistory(events);

        expect(replayed.state.isDeleted).toBe(true);
        expect(replayed.version).toBe(2);
    });

    test("version is preserved after clearUncommittedEvents", () => {
        const agg = new PatientAggregate();
        agg.create(baseData());
        agg.clearUncommittedEvents();

        expect(agg.uncommittedEvents).toHaveLength(0);
        expect(agg.version).toBe(1);
    });

    test("rejects create on already initialized aggregate", () => {
        const agg = new PatientAggregate();
        agg.create(baseData());
        expect(() => agg.create(baseData())).toThrow("already initialized");
    });

    test("rejects update on deleted patient", () => {
        const agg = new PatientAggregate();
        agg.create(baseData());
        agg.delete();
        expect(() => agg.update(baseData())).toThrow("deleted");
    });

    test("rejects double delete", () => {
        const agg = new PatientAggregate();
        agg.create(baseData());
        agg.delete();
        expect(() => agg.delete()).toThrow("already deleted");
    });

    test("rejects create with invalid email", () => {
        const agg = new PatientAggregate();
        expect(() => agg.create({ ...baseData(), email: "not-an-email" })).toThrow("Invalid patient email");
    });

    test("rejects create with empty name", () => {
        const agg = new PatientAggregate();
        expect(() => agg.create({ ...baseData(), nome: "" })).toThrow("name is required");
    });

    test("dataNascimento is stored as a Date instance after replay", () => {
        const source = new PatientAggregate();
        source.create(baseData());
        const events = [...source.uncommittedEvents];

        const replayed = new PatientAggregate();
        replayed.loadFromHistory(events);

        expect(replayed.state.dataNascimento).toBeInstanceOf(Date);
    });
});
