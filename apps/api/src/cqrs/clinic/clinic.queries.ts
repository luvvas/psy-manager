import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { clinic, psychologistClinic, user } from "../../db/schema";

export const clinicQueries = {
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
};
