import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";
import { emailService } from "../services/email.service";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            ...schema,
        },
    }),
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
            await emailService.sendPasswordReset(user.email, url);
        },
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
            consentedAt: {
                type: "string",
                required: false,
            },
            consentVersion: {
                type: "string",
                required: false,
            },
        },
    },
    trustedOrigins: [
        "http://localhost:5173",
        "http://localhost:3000",
        "app://localhost",
        process.env.BETTER_AUTH_URL || "",
    ].filter(Boolean),
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
    },
    defaultCookieAttributes: {
        // "none" required in production so the Electron desktop app (app://localhost)
        // can send cookies to the cloud API cross-origin. Requires Secure=true, which
        // useSecureCookies already sets in production. Dev keeps "lax" because local
        // HTTP doesn't support Secure cookies and both origins are localhost anyway.
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
});
