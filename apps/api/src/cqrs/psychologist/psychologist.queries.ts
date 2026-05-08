import { eq } from "drizzle-orm";
import { db } from "../../db";
import { user } from "../../db/schema";

export const psychologistQueries = {
    async getById(id: string) {
        const [result] = await db
            .select()
            .from(user)
            .where(eq(user.id, id))
            .limit(1);
        return result ?? null;
    },

    async getByEmail(email: string) {
        const [result] = await db
            .select()
            .from(user)
            .where(eq(user.email, email))
            .limit(1);
        return result ?? null;
    },

    async list() {
        return db.select().from(user);
    },
};
