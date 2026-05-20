import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            ...schema,
        },
    }),
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
