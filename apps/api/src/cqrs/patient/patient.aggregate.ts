import { AggregateRoot } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";

export interface PatientState {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    dataNascimento: Date | null;
    cidade: string;
    cpf: string;
    psychologistId: string;
    isDeleted: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export class PatientAggregate extends AggregateRoot<PatientState> {
    public readonly aggregateType = "patient";

    protected getInitialState(): PatientState {
        return {
            id: "",
            nome: "",
            email: "",
            telefone: "",
            dataNascimento: null,
            cidade: "",
            cpf: "",
            psychologistId: "",
            isDeleted: false,
            createdAt: null,
            updatedAt: null,
        };
    }

    /**
     * Creation business logic
     */
    public create(data: {
        id: string;
        nome: string;
        email: string;
        telefone: string;
        dataNascimento: Date;
        cidade: string;
        cpf: string;
        psychologistId: string;
    }): void {
        if (this._version > 0) {
            throw new Error("Patient aggregate already initialized");
        }
        if (!data.nome) throw new Error("Patient name is required");
        if (!data.email.includes("@")) throw new Error("Invalid patient email");

        this._id = data.id;
        this.raise("PATIENT_CREATED", data);
    }

    /**
     * Update business logic
     */
    public update(data: {
        nome: string;
        email: string;
        telefone: string;
        dataNascimento: Date;
        cidade: string;
        cpf: string;
    }): void {
        if (this._state.isDeleted) {
            throw new Error("Cannot update a deleted patient");
        }
        if (!data.nome) throw new Error("Patient name cannot be empty");

        this.raise("PATIENT_UPDATED", data);
    }

    /**
     * Delete business logic
     */
    public delete(): void {
        if (this._state.isDeleted) {
            throw new Error("Patient is already deleted");
        }
        this.raise("PATIENT_DELETED", {});
    }

    /**
     * Applies state changes corresponding to each event type.
     * This is pure function with no side effects.
     */
    protected applyEvent(state: PatientState, event: DomainEvent): PatientState {
        switch (event.type) {
            case "PATIENT_CREATED":
                return {
                    ...state,
                    id: event.data.id,
                    nome: event.data.nome,
                    email: event.data.email,
                    telefone: event.data.telefone,
                    dataNascimento: new Date(event.data.dataNascimento),
                    cidade: event.data.cidade,
                    cpf: event.data.cpf,
                    psychologistId: event.data.psychologistId,
                    isDeleted: false,
                    createdAt: event.createdAt ?? new Date(),
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "PATIENT_UPDATED":
                return {
                    ...state,
                    nome: event.data.nome,
                    email: event.data.email,
                    telefone: event.data.telefone,
                    dataNascimento: new Date(event.data.dataNascimento),
                    cidade: event.data.cidade,
                    cpf: event.data.cpf,
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "PATIENT_DELETED":
                return {
                    ...state,
                    isDeleted: true,
                    updatedAt: event.createdAt ?? new Date(),
                };

            default:
                return state;
        }
    }
}
