import { eq } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/schema";

export type Psychologist = typeof user.$inferSelect;
export type ThemeConfig = { primary?: string; sidebar?: string; button?: string };
export type PsychologistUpdate = Partial<Pick<Psychologist, "name" | "phone" | "crp" | "city" | "image">> & {
    themeConfig?: ThemeConfig | null;
};

/**
 * Psychologist service — business logic for psychologist profiles.
 * Keeps tRPC routers thin (controller layer only).
 */
export const psychologistService = {
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

    async updateProfile(id: string, data: PsychologistUpdate) {
        const [updated] = await db
            .update(user)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id))
            .returning();
        return updated;
    },

    async list() {
        return db.select().from(user);
    },
};
