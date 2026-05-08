import { AggregateRoot } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";

export interface ClinicState {
    id: string;
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    createdById: string;
    linkedPsychologists: string[]; // List of psychologist IDs linked to this clinic
    isDeleted: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export class ClinicAggregate extends AggregateRoot<ClinicState> {
    public readonly aggregateType = "clinic";

    protected getInitialState(): ClinicState {
        return {
            id: "",
            name: "",
            cnpj: "",
            phone: "",
            email: "",
            address: "",
            city: "",
            createdById: "",
            linkedPsychologists: [],
            isDeleted: false,
            createdAt: null,
            updatedAt: null,
        };
    }

    public create(data: {
        id: string;
        name: string;
        cnpj: string;
        phone: string;
        email: string;
        address: string;
        city: string;
        createdById: string;
    }): void {
        if (this._version > 0) {
            throw new Error("Clinic aggregate already initialized");
        }
        this._id = data.id;
        this.raise("CLINIC_CREATED", data);
    }

    public update(data: {
        name: string;
        cnpj: string;
        phone: string;
        email: string;
        address: string;
        city: string;
    }): void {
        if (this._state.isDeleted) {
            throw new Error("Cannot update a deleted clinic");
        }
        this.raise("CLINIC_UPDATED", data);
    }

    public delete(): void {
        if (this._state.isDeleted) {
            throw new Error("Clinic is already deleted");
        }
        this.raise("CLINIC_DELETED", {});
    }

    public linkPsychologist(psychologistId: string): void {
        if (this._state.isDeleted) {
            throw new Error("Cannot link a psychologist to a deleted clinic");
        }
        if (this._state.linkedPsychologists.includes(psychologistId)) {
            return; // Already linked
        }
        this.raise("PSYCHOLOGIST_LINKED_TO_CLINIC", { psychologistId });
    }

    public unlinkPsychologist(psychologistId: string): void {
        if (this._state.isDeleted) {
            throw new Error("Cannot unlink a psychologist from a deleted clinic");
        }
        if (!this._state.linkedPsychologists.includes(psychologistId)) {
            return; // Already unlinked
        }
        this.raise("PSYCHOLOGIST_UNLINKED_FROM_CLINIC", { psychologistId });
    }

    protected applyEvent(state: ClinicState, event: DomainEvent): ClinicState {
        switch (event.type) {
            case "CLINIC_CREATED":
                return {
                    ...state,
                    id: event.data.id,
                    name: event.data.name,
                    cnpj: event.data.cnpj,
                    phone: event.data.phone,
                    email: event.data.email,
                    address: event.data.address,
                    city: event.data.city,
                    createdById: event.data.createdById,
                    linkedPsychologists: [event.data.createdById], // Auto-link creator
                    isDeleted: false,
                    createdAt: event.createdAt ?? new Date(),
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "CLINIC_UPDATED":
                return {
                    ...state,
                    name: event.data.name,
                    cnpj: event.data.cnpj,
                    phone: event.data.phone,
                    email: event.data.email,
                    address: event.data.address,
                    city: event.data.city,
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "CLINIC_DELETED":
                return {
                    ...state,
                    isDeleted: true,
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "PSYCHOLOGIST_LINKED_TO_CLINIC":
                return {
                    ...state,
                    linkedPsychologists: [...state.linkedPsychologists, event.data.psychologistId],
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "PSYCHOLOGIST_UNLINKED_FROM_CLINIC":
                return {
                    ...state,
                    linkedPsychologists: state.linkedPsychologists.filter((id) => id !== event.data.psychologistId),
                    updatedAt: event.createdAt ?? new Date(),
                };

            default:
                return state;
        }
    }
}
