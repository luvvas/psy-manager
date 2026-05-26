import "../load-env";
import { faker } from "@faker-js/faker/locale/pt_BR";
import { randomUUID } from "node:crypto";
import { db } from "./index";
import {
    user,
    patient,
    financialTransaction,
    document,
    clinic,
    psychologistClinic,
    clinicalRecord,
} from "./schema";
import { encryptField } from "../lib/encryption";
import { eq } from "drizzle-orm";

const PATIENTS_COUNT = 50;
const TRANSACTIONS_COUNT = 200;
const DOCUMENTS_COUNT = 30;
const CLINICS_COUNT = 3;
const CLINICAL_RECORDS_PER_PATIENT = 3;

const PAYMENT_FORMS = ["pix", "cartao", "transferencia", "dinheiro"];
const BILLING_MODELS = ["sessao_avulsa", "pacote_mensal", "pacote_fechado"];
const SESSION_TYPES = ["presencial", "online"];
const ORIGEM_CONTATO = ["indicacao", "redes", "encaminhamento", "outro"];
const DOC_TYPES = ["contrato", "atestado", "laudo", "outro"];
const TX_INCOME_CATEGORIES = ["Sessão", "Avaliação", "Consultoria", "Supervisão"];
const TX_EXPENSE_CATEGORIES = ["Aluguel", "Software", "Supervisão", "Material", "Marketing", "Impostos", "Outros"];
const RECORD_CATEGORIES = ["evolucao", "anamnese", "outro"];

function randomPastDate(monthsBack: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - Math.floor(Math.random() * monthsBack));
    d.setDate(Math.floor(Math.random() * 28) + 1);
    return d;
}

function generateCpf(): string {
    return faker.string.numeric(11);
}

async function seed() {
    // Find target psychologist
    const email = process.env.SEED_USER_EMAIL;
    let targetUser: { id: string; name: string } | undefined;

    if (email) {
        const [found] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.email, email));
        targetUser = found;
        if (!targetUser) {
            console.error(`User with email "${email}" not found.`);
            process.exit(1);
        }
    } else {
        const [first] = await db.select({ id: user.id, name: user.name }).from(user).limit(1);
        targetUser = first;
        if (!targetUser) {
            console.error("No users found. Create an account first, then run the seed.");
            process.exit(1);
        }
    }

    const psychologistId = targetUser.id;
    console.log(`\nSeeding data for: ${targetUser.name} (${psychologistId})`);
    console.log("─────────────────────────────────────────────");

    // ── Patients ──────────────────────────────────────────────────────────────
    console.log(`Creating ${PATIENTS_COUNT} patients...`);
    const patientIds: string[] = [];

    for (let i = 0; i < PATIENTS_COUNT; i++) {
        const id = randomUUID();
        patientIds.push(id);
        const birthDate = faker.date.birthdate({ min: 18, max: 75, mode: "age" });

        await db.insert(patient).values({
            id,
            psychologistId,
            nome: encryptField(faker.person.fullName()) ?? "",
            email: encryptField(faker.internet.email()) ?? "",
            telefone: encryptField(faker.phone.number({ style: "national" })) ?? "",
            dataNascimento: encryptField(birthDate.toISOString()) ?? birthDate.toISOString(),
            cidade: faker.location.city(),
            cpf: encryptField(generateCpf()) ?? "",
            valorSessao: String(faker.number.int({ min: 150, max: 450 })),
            modeloCobranca: faker.helpers.arrayElement(BILLING_MODELS),
            formaPagamento: faker.helpers.arrayElement(PAYMENT_FORMS),
            servicoContratadoTipo: faker.helpers.arrayElement(SESSION_TYPES),
            origemContato: faker.helpers.arrayElement(ORIGEM_CONTATO),
            dataInicioAcompanhamento: randomPastDate(24),
        });
    }
    console.log(`  ✓ ${PATIENTS_COUNT} patients created`);

    // ── Financial Transactions ────────────────────────────────────────────────
    console.log(`Creating ${TRANSACTIONS_COUNT} financial transactions...`);
    const incomeCount = Math.floor(TRANSACTIONS_COUNT * 0.75);
    const expenseCount = TRANSACTIONS_COUNT - incomeCount;

    const txValues = [
        ...Array.from({ length: incomeCount }, () => ({
            id: randomUUID(),
            psychologistId,
            type: "income" as const,
            description: encryptField(
                faker.helpers.arrayElement(["Sessão", "Avaliação psicológica", "Supervisão", "Consulta de retorno", "Sessão de casal"])
            ) ?? "Sessão",
            amount: String(faker.number.int({ min: 150, max: 450 })),
            date: randomPastDate(12),
            category: faker.helpers.arrayElement(TX_INCOME_CATEGORIES),
            patientId: faker.helpers.arrayElement(patientIds),
            status: faker.helpers.weightedArrayElement([
                { value: "paid", weight: 8 },
                { value: "pending", weight: 2 },
            ]),
        })),
        ...Array.from({ length: expenseCount }, () => ({
            id: randomUUID(),
            psychologistId,
            type: "expense" as const,
            description: encryptField(
                faker.helpers.arrayElement(["Aluguel do consultório", "Software de gestão", "Supervisão clínica", "Material de escritório", "Marketing digital"])
            ) ?? "Despesa",
            amount: String(faker.number.int({ min: 50, max: 1500 })),
            date: randomPastDate(12),
            category: faker.helpers.arrayElement(TX_EXPENSE_CATEGORIES),
            patientId: null,
            status: "paid" as const,
        })),
    ];

    await db.insert(financialTransaction).values(txValues);
    console.log(`  ✓ ${incomeCount} receitas, ${expenseCount} despesas`);

    // ── Documents ─────────────────────────────────────────────────────────────
    console.log(`Creating ${DOCUMENTS_COUNT} documents...`);
    const docValues = Array.from({ length: DOCUMENTS_COUNT }, () => ({
        id: randomUUID(),
        psychologistId,
        title: encryptField(faker.helpers.arrayElement([
            "Contrato de Prestação de Serviços",
            "Termo de Consentimento Informado",
            "Laudo Psicológico",
            "Atestado de Frequência",
            "Modelo de Anamnese",
            "Declaração de Comparecimento",
            "Relatório de Acompanhamento",
            "Termo de Sigilo",
            "Contrato de Pacote",
            "Guia de Orientação ao Paciente",
        ])) ?? "Documento",
        content: encryptField(""),
        type: faker.helpers.arrayElement(DOC_TYPES),
        isTemplate: faker.datatype.boolean({ probability: 0.4 }),
    }));

    await db.insert(document).values(docValues);
    console.log(`  ✓ ${DOCUMENTS_COUNT} documents created`);

    // ── Clinics ───────────────────────────────────────────────────────────────
    console.log(`Creating ${CLINICS_COUNT} clinics...`);
    for (let i = 0; i < CLINICS_COUNT; i++) {
        const clinicId = randomUUID();
        await db.insert(clinic).values({
            id: clinicId,
            name: `Clínica ${faker.company.name()}`,
            cnpj: faker.string.numeric(14),
            phone: faker.phone.number({ style: "national" }),
            email: faker.internet.email(),
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            createdById: psychologistId,
        });
        await db.insert(psychologistClinic).values({
            id: randomUUID(),
            clinicId,
            psychologistId,
        });
    }
    console.log(`  ✓ ${CLINICS_COUNT} clinics created`);

    // ── Clinical Records ──────────────────────────────────────────────────────
    const totalRecords = Math.min(patientIds.length, 20) * CLINICAL_RECORDS_PER_PATIENT;
    console.log(`Creating ~${totalRecords} clinical records (${CLINICAL_RECORDS_PER_PATIENT} per patient, first 20 patients)...`);

    const recordValues = patientIds.slice(0, 20).flatMap((patientId) =>
        Array.from({ length: CLINICAL_RECORDS_PER_PATIENT }, () => ({
            id: randomUUID(),
            psychologistId,
            patientId,
            title: encryptField(
                faker.helpers.arrayElement(["Evolução de sessão", "Anamnese inicial", "Avaliação psicológica", "Registro de sessão"])
            ) ?? "Registro",
            category: faker.helpers.arrayElement(RECORD_CATEGORIES),
            textContent: encryptField(faker.lorem.paragraphs(2)),
            dateOfService: randomPastDate(12),
            status: faker.helpers.weightedArrayElement([
                { value: "finalized", weight: 6 },
                { value: "draft", weight: 4 },
            ]) as "finalized" | "draft",
        }))
    );

    await db.insert(clinicalRecord).values(recordValues);
    console.log(`  ✓ ${recordValues.length} clinical records created`);

    console.log("─────────────────────────────────────────────");
    console.log("Seed complete!\n");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
