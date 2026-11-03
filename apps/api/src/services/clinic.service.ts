import { eq, and, asc, inArray } from "drizzle-orm";
import { db } from "../db";
import { clinic, clinicRoom, psychologistClinic, user } from "../db/schema";

async function isOwner(psychologistId: string, clinicId: string): Promise<boolean> {
    const [row] = await db
        .select({ id: clinic.id })
        .from(clinic)
        .where(and(eq(clinic.id, clinicId), eq(clinic.createdById, psychologistId)));
    return !!row;
}

export const clinicService = {
    async list(psychologistId: string) {
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

        const membersByClinic = new Map<string, typeof members>();
        for (const member of members) {
            const list = membersByClinic.get(member.clinicId) ?? [];
            list.push(member);
            membersByClinic.set(member.clinicId, list);
        }

        const rooms = await db
            .select({ id: clinicRoom.id, clinicId: clinicRoom.clinicId, name: clinicRoom.name })
            .from(clinicRoom)
            .where(and(inArray(clinicRoom.clinicId, clinicIds), eq(clinicRoom.active, true)))
            .orderBy(asc(clinicRoom.name));
        const roomsByClinic = new Map<string, { id: string; name: string }[]>();
        for (const { clinicId, ...room } of rooms) {
            roomsByClinic.set(clinicId, [...(roomsByClinic.get(clinicId) ?? []), room]);
        }

        return clinics.map((cl) => ({
            ...cl,
            psychologists: (membersByClinic.get(cl.id) ?? []).map(({ clinicId: _, ...m }) => m),
            rooms: roomsByClinic.get(cl.id) ?? [],
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

    async addRoom(psychologistId: string, clinicId: string, name: string) {
        if (!(await isOwner(psychologistId, clinicId))) return null;
        const [room] = await db
            .insert(clinicRoom)
            .values({ id: crypto.randomUUID(), clinicId, name })
            .returning({ id: clinicRoom.id, name: clinicRoom.name });
        return room;
    },

    async renameRoom(psychologistId: string, roomId: string, name: string) {
        const [room] = await db
            .select({ clinicId: clinicRoom.clinicId })
            .from(clinicRoom)
            .where(and(eq(clinicRoom.id, roomId), eq(clinicRoom.active, true)));
        if (!room || !(await isOwner(psychologistId, room.clinicId))) return null;
        const [updated] = await db
            .update(clinicRoom)
            .set({ name, updatedAt: new Date() })
            .where(eq(clinicRoom.id, roomId))
            .returning({ id: clinicRoom.id, name: clinicRoom.name });
        return updated;
    },

    async archiveRoom(psychologistId: string, roomId: string) {
        const [room] = await db
            .select({ clinicId: clinicRoom.clinicId })
            .from(clinicRoom)
            .where(and(eq(clinicRoom.id, roomId), eq(clinicRoom.active, true)));
        if (!room || !(await isOwner(psychologistId, room.clinicId))) return null;
        await db
            .update(clinicRoom)
            .set({ active: false, updatedAt: new Date() })
            .where(eq(clinicRoom.id, roomId));
        return { success: true };
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
