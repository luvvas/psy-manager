import {
    pgTable,
    text,
    timestamp,
    boolean,
    integer,
    jsonb,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    phone: text("phone"),
    crp: text("crp"),
    city: text("city"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const patient = pgTable("patient", {
    id: text("id").primaryKey(),
    nome: text("nome").notNull(),
    email: text("email").notNull(),
    telefone: text("telefone").notNull(),
    dataNascimento: timestamp("data_nascimento").notNull(),
    cidade: text("cidade").notNull(),
    cpf: text("cpf").notNull(),
    psychologistId: text("psychologist_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const appointment = pgTable("appointment", {
    id: text("id").primaryKey(),
    psychologistId: text("psychologist_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    patientId: text("patient_id")
        .notNull()
        .references(() => patient.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    status: text("status").notNull().default("pending"), // pending, confirmed, cancelled, completed
    sessionType: text("session_type").notNull().default("online"), // online, in_person
    type: text("type").notNull().default("individual"), // individual, casal, infantil, avaliacao
    isRecurring: boolean("is_recurring").notNull().default(false),
    notes: text("notes"),
    googleEventId: text("google_event_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clinic = pgTable("clinic", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    cnpj: text("cnpj").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    createdById: text("created_by_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const psychologistClinic = pgTable("psychologist_clinic", {
    id: text("id").primaryKey(),
    clinicId: text("clinic_id")
        .notNull()
        .references(() => clinic.id, { onDelete: "cascade" }),
    psychologistId: text("psychologist_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const eventStore = pgTable("event_store", {
    id: text("id").primaryKey(),
    aggregateId: text("aggregate_id").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    type: text("type").notNull(),
    version: integer("version").notNull(),
    data: jsonb("data").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});


