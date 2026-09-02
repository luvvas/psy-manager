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
        process.env.BETTER_AUTH_URL || "",
    ].filter(Boolean),
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
    },
    defaultCookieAttributes: {
        // "lax" in every environment. The Electron desktop app (app://localhost) was the
        // only cross-origin consumer and required "none"; it has been removed. In
        // production CloudFront serves the SPA and proxies /api and /trpc to the EC2
        // origin under the same domain, so the session cookie is same-site and "lax"
        // holds — while blocking the cookie on cross-site requests (CSRF mitigation).
        sameSite: "lax",
    },
});
