import { AggregateRoot } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";

export interface PsychologistState {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    crp: string | null;
    city: string | null;
    image: string | null;
    updatedAt: Date | null;
}

export class PsychologistAggregate extends AggregateRoot<PsychologistState> {
    public readonly aggregateType = "psychologist";

    protected getInitialState(): PsychologistState {
        return {
            id: "",
            name: "",
            email: "",
            phone: null,
            crp: null,
            city: null,
            image: null,
            updatedAt: null,
        };
    }

    /**
     * Initializes a psychologist aggregate state when loaded for the first time.
     * Note: BetterAuth handles initial user row creation. We use this to initialize state from the db view.
     */
    public initialize(data: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        crp: string | null;
        city: string | null;
        image: string | null;
    }): void {
        this._id = data.id;
        this._state = {
            ...this._state,
            ...data,
        };
    }

    /**
     * Updates psychologist profile details.
     */
    public updateProfile(data: {
        name?: string;
        phone?: string;
        crp?: string;
        city?: string;
        image?: string;
    }): void {
        this.raise("PSYCHOLOGIST_PROFILE_UPDATED", data);
    }

    protected applyEvent(state: PsychologistState, event: DomainEvent): PsychologistState {
        switch (event.type) {
            case "PSYCHOLOGIST_PROFILE_UPDATED":
                return {
                    ...state,
                    name: event.data.name ?? state.name,
                    phone: event.data.phone ?? state.phone,
                    crp: event.data.crp ?? state.crp,
                    city: event.data.city ?? state.city,
                    image: event.data.image ?? state.image,
                    updatedAt: event.createdAt ?? new Date(),
                };
            default:
                return state;
        }
    }
}
