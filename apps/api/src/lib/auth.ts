import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../db";
import * as schema from "../db/schema";
import { emailService } from "../services/email.service";
import { betaInviteService } from "../services/beta-invite.service";

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
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    if (betaInviteService.isRequired() && !(await betaInviteService.isInvited(user.email))) {
                        throw new APIError("FORBIDDEN", {
                            code: "BETA_INVITE_REQUIRED",
                            message:
                                "O cadastro está liberado só para convidados do beta. Use o mesmo e-mail que você informou no formulário de inscrição.",
                        });
                    }
                },
            },
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
        ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173", "http://localhost:3000"]),
        process.env.BETTER_AUTH_URL || "",
    ].filter(Boolean),
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
    },
    defaultCookieAttributes: {
        sameSite: "lax",
    },
});
