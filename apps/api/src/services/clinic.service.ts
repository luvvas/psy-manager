import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { clinic, psychologistClinic, user } from "../db/schema";

export const clinicService = {
    async list(psychologistId: string) {
        // Query 1: clinics where this psychologist is a member
        const clinics = await db
            .select({
                id: clinic.id,
                name: clinic.name,
                cnpj: clinic.cnpj,
                phone: clinic.phone,
                email: clinic.email,
                address: clinic.address,
                city: clinic.city,
                createdById: clinic.createdById,
                createdAt: clinic.createdAt,
                updatedAt: clinic.updatedAt,
            })
            .from(clinic)
            .innerJoin(psychologistClinic, eq(clinic.id, psychologistClinic.clinicId))
            .where(and(eq(psychologistClinic.psychologistId, psychologistId), eq(psychologistClinic.status, "active")));

        if (clinics.length === 0) return [];

        // Query 2: all members of those clinics in a single IN query (replaces N sub-queries)
        const clinicIds = clinics.map((c) => c.id);
        const members = await db
            .select({
                clinicId: psychologistClinic.clinicId,
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
            })
            .from(psychologistClinic)
            .innerJoin(user, eq(psychologistClinic.psychologistId, user.id))
            .where(and(inArray(psychologistClinic.clinicId, clinicIds), eq(psychologistClinic.status, "active")));

        // Group members by clinicId in memory
        const membersByClinic = new Map<string, typeof members>();
        for (const member of members) {
            const list = membersByClinic.get(member.clinicId) ?? [];
            list.push(member);
            membersByClinic.set(member.clinicId, list);
        }

        return clinics.map((cl) => ({
            ...cl,
            psychologists: (membersByClinic.get(cl.id) ?? []).map(({ clinicId: _, ...m }) => m),
        }));
    },

    async create(psychologistId: string, data: {
        name: string;
        cnpj: string;
        phone: string;
        email: string;
        address: string;
        city: string;
    }) {
        const id = crypto.randomUUID();
        const [newClinic] = await db
            .insert(clinic)
            .values({
                id,
                name: data.name,
                cnpj: data.cnpj,
                phone: data.phone,
                email: data.email,
                address: data.address,
                city: data.city,
                createdById: psychologistId,
            })
            .returning();

        // Auto-link the creator psychologist to the clinic
        await db.insert(psychologistClinic).values({
            id: crypto.randomUUID(),
            clinicId: id,
            psychologistId,
        });

        return newClinic;
    },

    async update(psychologistId: string, id: string, data: {
        name: string;
        cnpj: string;
        phone: string;
        email: string;
        address: string;
        city: string;
    }) {
        const [updatedClinic] = await db
            .update(clinic)
            .set({
                name: data.name,
                cnpj: data.cnpj,
                phone: data.phone,
                email: data.email,
                address: data.address,
                city: data.city,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(clinic.id, id),
                    eq(clinic.createdById, psychologistId)
                )
            )
            .returning();
        return updatedClinic ?? null;
    },

    async delete(psychologistId: string, id: string) {
        const [deletedClinic] = await db
            .delete(clinic)
            .where(
                and(
                    eq(clinic.id, id),
                    eq(clinic.createdById, psychologistId)
                )
            )
            .returning();
        return deletedClinic ?? null;
    },

    // Linking used to add the member immediately, letting anyone pull another
    // psychologist into their clinic and read their agenda (audit F1). Now it
    // only creates a pending invite that the invitee must accept. The response
    // is the same whether or not the e-mail has an account.
    async linkPsychologist(requesterId: string, clinicId: string, psychologistEmail: string) {
        const [ownerClinic] = await db
            .select({ id: clinic.id })
            .from(clinic)
            .where(and(eq(clinic.id, clinicId), eq(clinic.createdById, requesterId)));

        if (!ownerClinic) {
            throw new Error("Clínica não encontrada ou sem permissão.");
        }

        const [targetUser] = await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, psychologistEmail));

        if (targetUser) {
            const [existingLink] = await db
                .select({ id: psychologistClinic.id })
                .from(psychologistClinic)
                .where(
                    and(
                        eq(psychologistClinic.clinicId, clinicId),
                        eq(psychologistClinic.psychologistId, targetUser.id)
                    )
                );

            if (!existingLink) {
                await db.insert(psychologistClinic).values({
                    id: crypto.randomUUID(),
                    clinicId,
                    psychologistId: targetUser.id,
                    status: "pending",
                });
            }
        }

        return { success: true };
    },

    async listInvites(psychologistId: string) {
        return db
            .select({
                clinicId: clinic.id,
                name: clinic.name,
                city: clinic.city,
                invitedAt: psychologistClinic.createdAt,
            })
            .from(psychologistClinic)
            .innerJoin(clinic, eq(clinic.id, psychologistClinic.clinicId))
            .where(
                and(
                    eq(psychologistClinic.psychologistId, psychologistId),
                    eq(psychologistClinic.status, "pending")
                )
            );
    },

    async acceptInvite(psychologistId: string, clinicId: string) {
        const [accepted] = await db
            .update(psychologistClinic)
            .set({ status: "active", updatedAt: new Date() })
            .where(
                and(
                    eq(psychologistClinic.clinicId, clinicId),
                    eq(psychologistClinic.psychologistId, psychologistId),
                    eq(psychologistClinic.status, "pending")
                )
            )
            .returning();
        return accepted ?? null;
    },

    async declineInvite(psychologistId: string, clinicId: string) {
        const [declined] = await db
            .delete(psychologistClinic)
            .where(
                and(
                    eq(psychologistClinic.clinicId, clinicId),
                    eq(psychologistClinic.psychologistId, psychologistId),
                    eq(psychologistClinic.status, "pending")
                )
            )
            .returning();
        return declined ?? null;
    },

    async leave(psychologistId: string, clinicId: string) {
        const [ownClinic] = await db
            .select({ id: clinic.id })
            .from(clinic)
            .where(and(eq(clinic.id, clinicId), eq(clinic.createdById, psychologistId)));

        if (ownClinic) {
            throw new Error("O dono não pode sair da própria clínica. Exclua a clínica, se for o caso.");
        }

        const [left] = await db
            .delete(psychologistClinic)
            .where(
                and(
                    eq(psychologistClinic.clinicId, clinicId),
                    eq(psychologistClinic.psychologistId, psychologistId)
                )
            )
            .returning();
        return left ?? null;
    },

    async unlinkPsychologist(requesterId: string, clinicId: string, psychologistId: string) {
        const [ownerClinic] = await db
            .select({ id: clinic.id })
            .from(clinic)
            .where(and(eq(clinic.id, clinicId), eq(clinic.createdById, requesterId)));

        if (!ownerClinic) {
            throw new Error("Clínica não encontrada ou sem permissão.");
        }

        if (psychologistId === requesterId) {
            throw new Error("O dono não pode se remover da própria clínica.");
        }

        const [deletedLink] = await db
            .delete(psychologistClinic)
            .where(
                and(
                    eq(psychologistClinic.clinicId, clinicId),
                    eq(psychologistClinic.psychologistId, psychologistId)
                )
            )
            .returning();
        return deletedLink ?? null;
    },
};
