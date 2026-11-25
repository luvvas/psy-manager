import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { betaInvite } from "../db/schema";

function normalize(emails: string[]) {
    return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

export const betaInviteService = {
    isRequired() {
        return process.env.BETA_INVITE_ONLY === "true";
    },

    async isInvited(email: string) {
        const [normalized] = normalize([email]);
        if (!normalized) return false;
        const rows = await db
            .select({ email: betaInvite.email })
            .from(betaInvite)
            .where(eq(betaInvite.email, normalized))
            .limit(1);
        return rows.length > 0;
    },

    async add(emails: string[]) {
        const values = normalize(emails);
        if (values.length === 0) return [];
        const inserted = await db
            .insert(betaInvite)
            .values(values.map((email) => ({ email })))
            .onConflictDoNothing()
            .returning({ email: betaInvite.email });
        return inserted.map((row) => row.email);
    },

    async remove(emails: string[]) {
        const values = normalize(emails);
        if (values.length === 0) return [];
        const deleted = await db
            .delete(betaInvite)
            .where(inArray(betaInvite.email, values))
            .returning({ email: betaInvite.email });
        return deleted.map((row) => row.email);
    },

    async list() {
        return db.select().from(betaInvite).orderBy(asc(betaInvite.createdAt));
    },
};
