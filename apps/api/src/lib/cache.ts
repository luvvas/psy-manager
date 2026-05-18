import { Redis } from "ioredis";
import superjson from "superjson";

let _client: Redis | null = null;

export function getRedisClient(): Redis | null {
    if (!process.env.REDIS_URL) return null;
    if (!_client) {
        _client = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
        });
        _client.on("error", (err: Error) => {
            console.error("[Redis] connection error:", err.message);
        });
    }
    return _client;
}

const PATIENT_CACHE_TTL = 60;

function patientKey(psychologistId: string): string {
    return `patients:${psychologistId}`;
}

export async function getCachedPatients<T>(psychologistId: string): Promise<T | null> {
    try {
        const redis = getRedisClient();
        if (!redis) return null;
        const raw = await redis.get(patientKey(psychologistId));
        if (!raw) return null;
        return superjson.parse<T>(raw);
    } catch (err) {
        console.error("[Redis] getCachedPatients error:", (err as Error).message);
        return null;
    }
}

export async function setCachedPatients<T>(psychologistId: string, patients: T): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis) return;
        await redis.set(patientKey(psychologistId), superjson.stringify(patients), "EX", PATIENT_CACHE_TTL);
    } catch (err) {
        console.error("[Redis] setCachedPatients error:", (err as Error).message);
    }
}

export async function invalidatePatientCache(psychologistId: string): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis) return;
        await redis.del(patientKey(psychologistId));
    } catch (err) {
        console.error("[Redis] invalidatePatientCache error:", (err as Error).message);
    }
}
