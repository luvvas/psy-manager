import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { clinic, psychologistClinic, user } from "../db/schema";

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
            .where(eq(psychologistClinic.psychologistId, psychologistId));

        const result = [];
        for (const cl of clinics) {
            const psychologists = await db
                .select({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                })
                .from(psychologistClinic)
                .innerJoin(user, eq(psychologistClinic.psychologistId, user.id))
                .where(eq(psychologistClinic.clinicId, cl.id));

            result.push({
                ...cl,
                psychologists,
            });
        }
        return result;
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

    async linkPsychologist(clinicId: string, psychologistEmail: string) {
        const [targetUser] = await db
            .select()
            .from(user)
            .where(eq(user.email, psychologistEmail));

        if (!targetUser) {
            throw new Error("Psicólogo com este e-mail não encontrado");
        }

        const [existingLink] = await db
            .select()
            .from(psychologistClinic)
            .where(
                and(
                    eq(psychologistClinic.clinicId, clinicId),
                    eq(psychologistClinic.psychologistId, targetUser.id)
                )
            );

        if (existingLink) {
            return existingLink;
        }

        const [newLink] = await db
            .insert(psychologistClinic)
            .values({
                id: crypto.randomUUID(),
                clinicId,
                psychologistId: targetUser.id,
            })
            .returning();

        return newLink;
    },

    async unlinkPsychologist(clinicId: string, psychologistId: string) {
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
