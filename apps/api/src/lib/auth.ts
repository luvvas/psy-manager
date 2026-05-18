import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";
import { getRedisClient } from "./cache";

function buildSecondaryStorage() {
    const redis = getRedisClient();
    if (!redis) return undefined;
    return {
        get: (key: string) => redis.get(key),
        set: async (key: string, value: string, ttl?: number) => {
            if (ttl) {
                await redis.set(key, value, "EX", ttl);
            } else {
                await redis.set(key, value);
            }
        },
        delete: async (key: string) => {
            await redis.del(key);
        },
    };
}

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            ...schema,
        },
    }),
    secondaryStorage: buildSecondaryStorage(),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            phone: {
                type: "string",
                required: false,
            },
            crp: {
                type: "string",
                required: false,
            },
            city: {
                type: "string",
                required: false,
            },
        },
    },
    trustedOrigins: [
        "http://localhost:5173",
        "http://localhost:3000",
        process.env.BETTER_AUTH_URL || "",
    ].filter(Boolean),
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
    },
    defaultCookieAttributes: {
        sameSite: "lax", // Allows cookies to be sent back during Google GET callback on HTTP
    },
});
