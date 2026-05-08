import { eq, asc, desc } from "drizzle-orm";
import { db } from "../../db";
import { eventStore } from "../../db/schema";

/**
 * Represents a domain event in the event sourcing system.
 */
export interface DomainEvent<TPayload = any> {
    id: string; // Unique ID for this specific event occurrence
    aggregateId: string; // The ID of the aggregate this event belongs to
    aggregateType: string; // The type of the aggregate (e.g. 'patient')
    type: string; // The event type name (e.g. 'PATIENT_CREATED')
    version: number; // The version of the aggregate after applying this event
    data: TPayload; // The payload data containing state changes
    metadata?: Record<string, any>; // Context metadata (e.g., actorId, timestamp, ip)
    createdAt?: Date;
}

/**
 * Base class for all aggregates in the Event Sourcing architecture.
 */
export abstract class AggregateRoot<TState> {
    public abstract readonly aggregateType: string;
    
    protected _id!: string;
    protected _version: number = 0;
    protected _state!: TState;
    private _uncommittedEvents: DomainEvent[] = [];

    constructor(id?: string) {
        if (id) {
            this._id = id;
        }
        this._state = this.getInitialState();
    }

    public get id(): string {
        return this._id;
    }

    public get version(): number {
        return this._version;
    }

    public get state(): TState {
        return this._state;
    }

    public get uncommittedEvents(): DomainEvent[] {
        return [...this._uncommittedEvents];
    }

    /**
     * Resets the uncommitted events list after they are successfully stored.
     */
    public clearUncommittedEvents(): void {
        this._uncommittedEvents = [];
    }

    /**
     * Abstract method to return the initial empty state of the aggregate.
     */
    protected abstract getInitialState(): TState;

    /**
     * Applies an event to reconstruct the aggregate state.
     * This is used both for replaying history and for raising new events.
     */
    public apply(event: DomainEvent): void {
        this._id = event.aggregateId;
        this._version = event.version;
        this._state = this.applyEvent(this._state, event);
    }

    /**
     * Subclasses must implement this to define how each event type modifies the state.
     */
    protected abstract applyEvent(state: TState, event: DomainEvent): TState;

    /**
     * Raises a new domain event, applying it to local state and queueing it for persistence.
     */
    protected raise(type: string, data: any, metadata?: Record<string, any>): void {
        const nextVersion = this._version + 1;
        const event: DomainEvent = {
            id: crypto.randomUUID(),
            aggregateId: this._id,
            aggregateType: this.aggregateType,
            type,
            version: nextVersion,
            data,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
            },
            createdAt: new Date(),
        };

        this.apply(event);
        this._uncommittedEvents.push(event);
    }

    /**
     * Rebuilds the aggregate state by replaying a list of historical events.
     */
    public loadFromHistory(events: DomainEvent[]): void {
        for (const event of events) {
            this.apply(event);
        }
    }
}

/**
 * Event Store implementation using Drizzle ORM and PostgreSQL.
 */
export const cqrsEventStore = {
    /**
     * Appends a list of events for a specific aggregate to the store.
     * Uses optimistic concurrency control by checking the expected version.
     */
    async saveEvents(
        aggregateId: string,
        expectedVersion: number,
        events: DomainEvent[]
    ): Promise<void> {
        if (events.length === 0) return;

        // Optimistic Concurrency Check: Verify that the current version matches expected
        const [latestEvent] = await db
            .select({ version: eventStore.version })
            .from(eventStore)
            .where(eq(eventStore.aggregateId, aggregateId))
            .orderBy(desc(eventStore.version))
            .limit(1);

        const currentVersion = latestEvent?.version ?? 0;
        if (currentVersion !== expectedVersion) {
            throw new Error(
                `Concurrency Conflict: Aggregate ${aggregateId} is at version ${currentVersion}, but expected version ${expectedVersion}`
            );
        }

        // Insert new events in a transaction
        await db.transaction(async (tx) => {
            for (const event of events) {
                await tx.insert(eventStore).values({
                    id: event.id,
                    aggregateId: event.aggregateId,
                    aggregateType: event.aggregateType,
                    type: event.type,
                    version: event.version,
                    data: event.data,
                    metadata: event.metadata,
                    createdAt: event.createdAt ?? new Date(),
                });
            }
        });
    },

    /**
     * Loads all historical events for an aggregate, ordered by version.
     */
    async getEvents(aggregateId: string): Promise<DomainEvent[]> {
        const dbEvents = await db
            .select()
            .from(eventStore)
            .where(eq(eventStore.aggregateId, aggregateId))
            .orderBy(asc(eventStore.version));

        return dbEvents.map((e) => ({
            id: e.id,
            aggregateId: e.aggregateId,
            aggregateType: e.aggregateType,
            type: e.type,
            version: e.version,
            data: e.data,
            metadata: (e.metadata as Record<string, any>) ?? undefined,
            createdAt: e.createdAt,
        }));
    },
};

/**
 * Lightweight In-Memory Event Bus to dispatch events to read-model projections in real-time.
 */
type EventSubscriber = (event: DomainEvent) => Promise<void> | void;

export class EventBus {
    private static instance: EventBus;
    private subscribers: Map<string, Set<EventSubscriber>> = new Map();

    private constructor() {}

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * Subscribe to a specific event type, or '*' for all events.
     */
    public subscribe(eventType: string, subscriber: EventSubscriber): void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType)!.add(subscriber);
    }

    /**
     * Unsubscribe from a specific event.
     */
    public unsubscribe(eventType: string, subscriber: EventSubscriber): void {
        const set = this.subscribers.get(eventType);
        if (set) {
            set.delete(subscriber);
        }
    }

    /**
     * Publish an event to all interested subscribers.
     */
    public async publish(event: DomainEvent): Promise<void> {
        const specificSubscribers = this.subscribers.get(event.type) ?? new Set();
        const globalSubscribers = this.subscribers.get("*") ?? new Set();

        const allSubscribers = new Set([...specificSubscribers, ...globalSubscribers]);

        // Process subscribers concurrently or sequentially depending on requirements.
        // For projection stability, we run them concurrently and log failures.
        const promises = Array.from(allSubscribers).map(async (sub) => {
            try {
                await sub(event);
            } catch (err) {
                console.error(`❌ Error in event subscriber for type "${event.type}":`, err);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Publish multiple events sequentially.
     */
    public async publishAll(events: DomainEvent[]): Promise<void> {
        for (const event of events) {
            await this.publish(event);
        }
    }
}

export const eventBus = EventBus.getInstance();
