import {
    pgTable,
    text,
    timestamp,
    boolean,
    integer,
    jsonb,
    numeric,
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
    themeConfig: jsonb("theme_config").$type<{ primary?: string; sidebar?: string; button?: string }>(),
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
    valorSessao: numeric("valor_sessao", { precision: 10, scale: 2 }),
    modeloCobranca: text("modelo_cobranca"), // sessao_avulsa, pacote_mensal, pacote_fechado, etc.
    
    // Expansão de Dados Pessoais & Identificação
    nomeSocial: text("nome_social"),
    rg: text("rg"),
    profissao: text("profissao"),
    
    // Expansão de Endereço e Emergência
    endereco: text("endereco"),
    cep: text("cep"),
    uf: text("uf"),
    contatoEmergencia: text("contato_emergencia"),
    
    // Dados do Responsável Legal
    respLegalNome: text("resp_legal_nome"),
    respLegalParentesco: text("resp_legal_parentesco"),
    respLegalCpf: text("resp_legal_cpf"),
    respLegalTelefone: text("resp_legal_telefone"),
    respLegalEmail: text("resp_legal_email"),
    
    // Serviço Contratado & Origem
    servicoContratadoTipo: text("servico_contratado_tipo"), // presencial, online
    dataInicioAcompanhamento: timestamp("data_inicio_acompanhamento"),
    formaPagamento: text("forma_pagamento"), // pix, cartao, outro
    formaPagamentoDetalhe: text("forma_pagamento_detalhe"),
    responsavelFinanceiroTipo: text("responsavel_financeiro_tipo"), // paciente, responsavel, outro
    responsavelFinanceiroDetalhe: text("responsavel_financeiro_detalhe"),
    origemContato: text("origem_contato"), // indicacao, redes, encaminhamento, outro
    origemContatoDetalhe: text("origem_contato_detalhe"),

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

export const financialTransaction = pgTable("financial_transaction", {
    id: text("id").primaryKey(),
    psychologistId: text("psychologist_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // income (receita), expense (despesa)
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    date: timestamp("date").notNull(),
    category: text("category"), // e.g., Aluguel, Sessão, Software, etc.
    patientId: text("patient_id")
        .references(() => patient.id, { onDelete: "set null" }),
    status: text("status").notNull().default("paid"), // paid, pending, overdue
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const document = pgTable("document", {
    id: text("id").primaryKey(),
    psychologistId: text("psychologist_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    patientId: text("patient_id")
        .references(() => patient.id, { onDelete: "cascade" }), // Opcional, pode ser um template genérico se nulo
    title: text("title").notNull(),
    content: text("content"), // Armazena o HTML ou JSON string do editor de texto
    storageKey: text("storage_key"), // Chave do objeto no storage (S3/local)
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    type: text("type").notNull().default("outro"), // evolucao, contrato, atestado, laudo, outro
    category: text("category"), // Para categorização extra
    isTemplate: boolean("is_template").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clinicalRecord = pgTable("clinical_record", {
    id: text("id").primaryKey(),
    psychologistId: text("psychologist_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    patientId: text("patient_id")
        .notNull()
        .references(() => patient.id, { onDelete: "cascade" }),
    appointmentId: text("appointment_id")
        .references(() => appointment.id, { onDelete: "set null" }), // Vincula à sessão
    title: text("title").notNull(),
    category: text("category").notNull().default("evolucao"), // evolucao, anamnese, documento_externo, teste_psicologico, outro
    textContent: text("text_content"), // Se for digitado no sistema
    fileUrl: text("file_url"), // Arquivo anexo/PDF (armazenando Base64 temporariamente)
    storageKey: text("storage_key"), // Chave do objeto no storage (S3/local)
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    dateOfService: timestamp("date_of_service").notNull().defaultNow(), // Quando o atendimento ocorreu
    status: text("status").notNull().default("draft"), // draft ou finalized
    lockedAt: timestamp("locked_at"), // Quando foi assinado
    parentRecordId: text("parent_record_id"), // Retificações (aponta para o registro com erro)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
