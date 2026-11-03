import "../load-env";
import { faker } from "@faker-js/faker/locale/pt_BR";
import { randomUUID } from "node:crypto";
import { db } from "./index";
import {
    user,
    financialTransaction,
    document,
    clinic,
    clinicRoom,
    psychologistClinic,
    clinicalRecord,
} from "./schema";
import { encryptField } from "../lib/encryption";
import { and, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { patientCommands } from "../cqrs/patient/patient.commands";
import { patientProjections } from "../cqrs/patient/patient.projections";
import { appointmentCommands } from "../cqrs/appointment/appointment.commands";
import { appointmentProjections } from "../cqrs/appointment/appointment.projections";
import type { WorkSchedule } from "../lib/work-schedule";

const PATIENTS_COUNT = 50;
const COLLEAGUE_PATIENTS_COUNT = 12;
const TRANSACTIONS_COUNT = 200;
const COLLEAGUE_TRANSACTIONS_COUNT = 40;
const DOCUMENTS_COUNT = 30;
const CLINICAL_RECORDS_PER_PATIENT = 3;
const APPOINTMENT_DAYS_BACK = 14;
const APPOINTMENT_DAYS_FORWARD = 14;
const SESSION_MINUTES = 50;
const APPOINTMENT_TYPES = ["individual", "individual", "individual", "casal", "infantil", "avaliacao"];

const SEED_PASSWORD = process.env.SEED_PASSWORD || "Seed@12345";
const SHARED_CLINIC_NAME = "Clínica Harmonia (seed)";
const COLLEAGUE_CLINIC_NAME = "Espaço Bem-Estar (seed)";
const NO_ROOMS_CLINIC_NAME = "Consultório Centro (seed)";

const PAYMENT_FORMS = ["pix", "cartao", "transferencia", "dinheiro"];
const BILLING_MODELS = ["sessao_avulsa", "pacote_mensal", "pacote_fechado"];
const SESSION_TYPES = ["presencial", "online"];
const ORIGEM_CONTATO = ["indicacao", "redes", "encaminhamento", "outro"];
const DOC_TYPES = ["contrato", "atestado", "laudo", "outro"];
const TX_INCOME_CATEGORIES = ["Sessão", "Avaliação", "Consultoria", "Supervisão"];
const TX_EXPENSE_CATEGORIES = ["Aluguel", "Software", "Supervisão", "Material", "Marketing", "Impostos", "Outros"];
const RECORD_CATEGORIES = ["evolucao", "anamnese", "outro"];

const shift = (start: string, end: string) => ({ start, end });
const week = (byDay: Partial<Record<number, { start: string; end: string }[]>>): WorkSchedule["days"] =>
    Array.from({ length: 7 }, (_, d) => byDay[d] ?? []);

const MAIN_SCHEDULE: WorkSchedule = {
    sessionMinutes: SESSION_MINUTES,
    bufferMinutes: 10,
    days: week({
        1: [shift("08:00", "12:00"), shift("13:00", "19:00")],
        2: [shift("08:00", "12:00"), shift("13:00", "19:00")],
        3: [shift("08:00", "12:00"), shift("13:00", "19:00")],
        4: [shift("08:00", "12:00"), shift("13:00", "19:00")],
        5: [shift("08:00", "12:00"), shift("13:00", "17:00")],
        6: [shift("08:00", "12:00")],
    }),
};

interface ColleagueSpec {
    key: "ana" | "bruno" | "carla";
    name: string;
    email: string;
    crp: string;
    city: string;
    schedule: WorkSchedule;
}

const COLLEAGUES: ColleagueSpec[] = [
    {
        key: "ana",
        name: "Ana Ribeiro (seed)",
        email: "ana.seed@psymanager.dev",
        crp: "06/111111",
        city: "São Paulo",
        schedule: {
            sessionMinutes: SESSION_MINUTES,
            bufferMinutes: 10,
            days: week({ 1: [shift("08:00", "17:00")], 2: [shift("08:00", "17:00")], 3: [shift("08:00", "17:00")], 4: [shift("08:00", "17:00")], 5: [shift("08:00", "17:00")] }),
        },
    },
    {
        key: "bruno",
        name: "Bruno Lima (seed)",
        email: "bruno.seed@psymanager.dev",
        crp: "06/222222",
        city: "São Paulo",
        schedule: {
            sessionMinutes: SESSION_MINUTES,
            bufferMinutes: 10,
            days: week({ 1: [shift("13:00", "21:00")], 2: [shift("13:00", "21:00")], 3: [shift("13:00", "21:00")], 4: [shift("13:00", "21:00")], 5: [shift("13:00", "21:00")] }),
        },
    },
    {
        key: "carla",
        name: "Carla Mendes (seed)",
        email: "carla.seed@psymanager.dev",
        crp: "06/333333",
        city: "Santo André",
        schedule: {
            sessionMinutes: SESSION_MINUTES,
            bufferMinutes: 10,
            days: week({ 1: [shift("08:00", "12:00"), shift("14:00", "18:00")], 3: [shift("08:00", "12:00"), shift("14:00", "18:00")], 5: [shift("08:00", "12:00"), shift("14:00", "18:00")] }),
        },
    },
];

function randomPastDate(monthsBack: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - Math.floor(Math.random() * monthsBack));
    d.setDate(Math.floor(Math.random() * 28) + 1);
    return d;
}

function addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + minutes;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function generateCpf(): string {
    return faker.string.numeric(11);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function hourlyStarts(schedule: WorkSchedule, weekday: number): string[] {
    return schedule.days[weekday].flatMap(({ start, end }) => {
        const starts: string[] = [];
        for (let t = start; addMinutes(t, SESSION_MINUTES) <= end; t = addMinutes(t, 60)) starts.push(t);
        return starts;
    });
}

function nextWeekday(from: Date): Date {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d;
}

const busyPsy = new Set<string>();
const busyRoom = new Set<string>();
const psyKey = (psyId: string, date: Date, start: string) => `${psyId}|${dayKey(date)}|${start}`;
const roomKey = (roomId: string, date: Date, start: string) => `${roomId}|${dayKey(date)}|${start}`;

interface SeedRoom {
    id: string;
    name: string;
    clinicId: string;
}

async function scheduleAppointment(opts: {
    psychologistId: string;
    patientId: string;
    date: Date;
    startTime: string;
    status: string;
    room?: SeedRoom | null;
    notes?: string;
}) {
    const { psychologistId, date, startTime, room } = opts;
    busyPsy.add(psyKey(psychologistId, date, startTime));
    if (room) busyRoom.add(roomKey(room.id, date, startTime));

    await appointmentCommands.schedule({
        psychologistId,
        patientId: opts.patientId,
        date,
        startTime,
        endTime: addMinutes(startTime, SESSION_MINUTES),
        status: opts.status,
        sessionType: room
            ? faker.helpers.weightedArrayElement([
                  { value: "in_person", weight: 4 },
                  { value: "online", weight: 1 },
              ])
            : faker.helpers.arrayElement(["online", "in_person"]),
        type: faker.helpers.arrayElement(APPOINTMENT_TYPES),
        isRecurring: false,
        notes: opts.notes,
        clinicId: room?.clinicId ?? null,
        roomId: room?.id ?? null,
    });
}

function randomStatus(date: Date, startTime: string, now: Date): string {
    const endTime = addMinutes(startTime, SESSION_MINUTES);
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isPast = date < today || (dayKey(date) === dayKey(today) && endTime <= nowTime);
    return isPast
        ? faker.helpers.weightedArrayElement([
              { value: "completed", weight: 8 },
              { value: "cancelled", weight: 2 },
          ])
        : faker.helpers.weightedArrayElement([
              { value: "confirmed", weight: 6 },
              { value: "pending", weight: 3 },
              { value: "cancelled", weight: 1 },
          ]);
}

const MAIN_USER = {
    name: process.env.SEED_USER_NAME || "Lucas Machado",
    email: process.env.SEED_USER_EMAIL || "lucas@psymanager.com",
    password: process.env.SEED_USER_PASSWORD || "12345678",
};

async function ensureMainUser(): Promise<{ id: string; name: string; created: boolean }> {
    const [found] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.email, MAIN_USER.email));
    if (found) return { ...found, created: false };
    const result = await auth.api.signUpEmail({
        body: { name: MAIN_USER.name, email: MAIN_USER.email, password: MAIN_USER.password },
    });
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, result.user.id));
    return { id: result.user.id, name: result.user.name, created: true };
}

async function ensureColleague(spec: ColleagueSpec): Promise<string> {
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, spec.email));
    if (existing) return existing.id;
    const result = await auth.api.signUpEmail({
        body: { name: spec.name, email: spec.email, password: SEED_PASSWORD },
    });
    await db.update(user).set({ crp: spec.crp, city: spec.city, emailVerified: true }).where(eq(user.id, result.user.id));
    return result.user.id;
}

async function seedPatients(psychologistId: string, count: number): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
        ids.push(
            await patientCommands.create({
                psychologistId,
                nome: faker.person.fullName(),
                email: faker.internet.email(),
                telefone: faker.phone.number({ style: "national" }),
                dataNascimento: faker.date.birthdate({ min: 18, max: 75, mode: "age" }),
                cidade: faker.location.city(),
                cpf: generateCpf(),
                valorSessao: String(faker.number.int({ min: 150, max: 450 })),
                modeloCobranca: faker.helpers.arrayElement(BILLING_MODELS),
                formaPagamento: faker.helpers.arrayElement(PAYMENT_FORMS),
                servicoContratadoTipo: faker.helpers.arrayElement(SESSION_TYPES),
                origemContato: faker.helpers.arrayElement(ORIGEM_CONTATO),
                dataInicioAcompanhamento: randomPastDate(24),
            })
        );
    }
    return ids;
}

async function seedTransactions(psychologistId: string, patientIds: string[], count: number) {
    const incomeCount = Math.floor(count * 0.75);
    const expenseCount = count - incomeCount;
    await db.insert(financialTransaction).values([
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
                faker.helpers.arrayElement(["Aluguel do consultório", "Aluguel de sala na clínica", "Software de gestão", "Supervisão clínica", "Material de escritório", "Marketing digital"])
            ) ?? "Despesa",
            amount: String(faker.number.int({ min: 50, max: 1500 })),
            date: randomPastDate(12),
            category: faker.helpers.arrayElement(TX_EXPENSE_CATEGORIES),
            patientId: null,
            status: "paid" as const,
        })),
    ]);
    return { incomeCount, expenseCount };
}

async function ensureClinic(opts: {
    name: string;
    ownerId: string;
    roomNames: string[];
    members: { id: string; status: "active" | "pending" }[];
}): Promise<{ id: string; rooms: SeedRoom[] }> {
    let [found] = await db
        .select({ id: clinic.id })
        .from(clinic)
        .where(and(eq(clinic.name, opts.name), eq(clinic.createdById, opts.ownerId)));

    if (!found) {
        found = { id: randomUUID() };
        await db.insert(clinic).values({
            id: found.id,
            name: opts.name,
            cnpj: faker.string.numeric(14),
            phone: faker.phone.number({ style: "national" }),
            email: faker.internet.email(),
            address: faker.location.streetAddress(),
            city: "São Paulo",
            createdById: opts.ownerId,
        });
        if (opts.roomNames.length > 0) {
            await db.insert(clinicRoom).values(opts.roomNames.map((name) => ({ id: randomUUID(), clinicId: found.id, name })));
        }
    }

    for (const member of [{ id: opts.ownerId, status: "active" as const }, ...opts.members]) {
        const [link] = await db
            .select({ id: psychologistClinic.id })
            .from(psychologistClinic)
            .where(and(eq(psychologistClinic.clinicId, found.id), eq(psychologistClinic.psychologistId, member.id)));
        if (!link) {
            await db.insert(psychologistClinic).values({
                id: randomUUID(),
                clinicId: found.id,
                psychologistId: member.id,
                status: member.status,
            });
        }
    }

    const rooms = await db
        .select({ id: clinicRoom.id, name: clinicRoom.name, clinicId: clinicRoom.clinicId })
        .from(clinicRoom)
        .where(and(eq(clinicRoom.clinicId, found.id), eq(clinicRoom.active, true)));
    rooms.sort((a, b) => a.name.localeCompare(b.name));
    return { id: found.id, rooms };
}

async function seed() {
    if (process.env.NODE_ENV === "production") {
        console.error("Seed bloqueado em produção (NODE_ENV=production).");
        process.exit(1);
    }

    const targetUser = await ensureMainUser();
    const psychologistId = targetUser.id;
    console.log(`\nSeeding data for: ${targetUser.name} (${psychologistId})`);
    console.log("─────────────────────────────────────────────");

    patientProjections.init();
    appointmentProjections.init();

    console.log(`Ensuring ${COLLEAGUES.length} colleague psychologists...`);
    const colleagueIds = {} as Record<ColleagueSpec["key"], string>;
    for (const spec of COLLEAGUES) {
        colleagueIds[spec.key] = await ensureColleague(spec);
        await db.update(user).set({ workSchedule: spec.schedule }).where(eq(user.id, colleagueIds[spec.key]));
    }
    const [main] = await db.select({ workSchedule: user.workSchedule }).from(user).where(eq(user.id, psychologistId));
    const mainSchedule = main?.workSchedule ?? MAIN_SCHEDULE;
    if (!main?.workSchedule) {
        await db.update(user).set({ workSchedule: MAIN_SCHEDULE }).where(eq(user.id, psychologistId));
    }
    console.log(`  ✓ colleagues ready, work schedules set${main?.workSchedule ? " (main kept its own)" : ""}`);

    console.log("Ensuring clinics and rooms...");
    const shared = await ensureClinic({
        name: SHARED_CLINIC_NAME,
        ownerId: psychologistId,
        roomNames: ["Sala 1", "Sala 2", "Sala 3"],
        members: COLLEAGUES.map((c) => ({ id: colleagueIds[c.key], status: "active" as const })),
    });
    const colleagueClinic = await ensureClinic({
        name: COLLEAGUE_CLINIC_NAME,
        ownerId: colleagueIds.ana,
        roomNames: ["Sala A", "Sala B"],
        members: [
            { id: colleagueIds.bruno, status: "active" },
            { id: psychologistId, status: "pending" },
        ],
    });
    await ensureClinic({ name: NO_ROOMS_CLINIC_NAME, ownerId: psychologistId, roomNames: [], members: [] });
    console.log(`  ✓ ${SHARED_CLINIC_NAME}: ${shared.rooms.map((r) => r.name).join(", ")}`);
    console.log(`  ✓ ${COLLEAGUE_CLINIC_NAME}: ${colleagueClinic.rooms.map((r) => r.name).join(", ")} (convite pendente para a principal)`);
    console.log(`  ✓ ${NO_ROOMS_CLINIC_NAME}: sem salas`);

    console.log(`Creating patients...`);
    const patientsByPsy: Record<string, string[]> = {
        [psychologistId]: await seedPatients(psychologistId, PATIENTS_COUNT),
    };
    for (const spec of COLLEAGUES) {
        patientsByPsy[colleagueIds[spec.key]] = await seedPatients(colleagueIds[spec.key], COLLEAGUE_PATIENTS_COUNT);
    }
    console.log(`  ✓ ${PATIENTS_COUNT} for the main psychologist, ${COLLEAGUE_PATIENTS_COUNT} per colleague`);

    const now = new Date();
    const scenarioDay = nextWeekday(now);
    const [sala1, sala2, sala3] = shared.rooms;
    const patientOf = (psyId: string) => faker.helpers.arrayElement(patientsByPsy[psyId]);
    if (sala1 && sala2 && sala3) {
        const fixed: { psyId: string; start: string; room: SeedRoom; notes: string }[] = [
            { psyId: colleagueIds.ana, start: "09:00", room: sala1, notes: "Seed: 09:00 só a Sala 1 ocupada" },
            { psyId: colleagueIds.ana, start: "14:00", room: sala1, notes: "Seed: 14:00 clínica lotada" },
            { psyId: colleagueIds.bruno, start: "14:00", room: sala2, notes: "Seed: 14:00 clínica lotada" },
            { psyId: colleagueIds.carla, start: "14:00", room: sala3, notes: "Seed: 14:00 clínica lotada" },
            { psyId: psychologistId, start: "16:00", room: sala1, notes: "Seed: 16:00 mesma clínica, sala diferente do Bruno" },
            { psyId: colleagueIds.bruno, start: "16:00", room: sala2, notes: "Seed: 16:00 mesma clínica, sala diferente da principal" },
        ];
        for (const f of fixed) {
            await scheduleAppointment({
                psychologistId: f.psyId,
                patientId: patientOf(f.psyId),
                date: scenarioDay,
                startTime: f.start,
                status: "confirmed",
                room: f.room,
                notes: f.notes,
            });
        }
        busyPsy.add(psyKey(psychologistId, scenarioDay, "09:00"));
        busyPsy.add(psyKey(psychologistId, scenarioDay, "14:00"));
    }

    console.log(`Creating appointments from ${APPOINTMENT_DAYS_BACK} days ago to ${APPOINTMENT_DAYS_FORWARD} days ahead...`);
    const people = [
        { id: psychologistId, schedule: mainSchedule, perDay: { min: 3, max: 6 }, clinics: [shared] },
        { id: colleagueIds.ana, schedule: COLLEAGUES[0].schedule, perDay: { min: 1, max: 4 }, clinics: [shared, colleagueClinic] },
        { id: colleagueIds.bruno, schedule: COLLEAGUES[1].schedule, perDay: { min: 1, max: 4 }, clinics: [shared, colleagueClinic] },
        { id: colleagueIds.carla, schedule: COLLEAGUES[2].schedule, perDay: { min: 1, max: 3 }, clinics: [shared] },
    ];
    let appointmentCount = 0;
    let inRoomCount = 0;

    for (let offset = -APPOINTMENT_DAYS_BACK; offset <= APPOINTMENT_DAYS_FORWARD; offset++) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        for (const person of people) {
            const starts = hourlyStarts(person.schedule, date.getDay()).filter(
                (s) => !busyPsy.has(psyKey(person.id, date, s))
            );
            const count = Math.min(starts.length, faker.number.int(person.perDay));
            for (const startTime of faker.helpers.arrayElements(starts, count).sort()) {
                let room: SeedRoom | null = null;
                if (faker.datatype.boolean({ probability: 0.5 })) {
                    const clinicRooms = faker.helpers.arrayElement(person.clinics).rooms;
                    room = faker.helpers.shuffle(clinicRooms).find((r) => !busyRoom.has(roomKey(r.id, date, startTime))) ?? null;
                }
                await scheduleAppointment({
                    psychologistId: person.id,
                    patientId: patientOf(person.id),
                    date,
                    startTime,
                    status: randomStatus(date, startTime, now),
                    room,
                    notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : undefined,
                });
                appointmentCount++;
                if (room) inRoomCount++;
            }
        }
    }
    console.log(`  ✓ ${appointmentCount} appointments (${inRoomCount} in a clinic room)`);

    console.log("Creating financial transactions...");
    const mainTx = await seedTransactions(psychologistId, patientsByPsy[psychologistId], TRANSACTIONS_COUNT);
    for (const spec of COLLEAGUES) {
        await seedTransactions(colleagueIds[spec.key], patientsByPsy[colleagueIds[spec.key]], COLLEAGUE_TRANSACTIONS_COUNT);
    }
    console.log(`  ✓ main: ${mainTx.incomeCount} receitas, ${mainTx.expenseCount} despesas; ${COLLEAGUE_TRANSACTIONS_COUNT} per colleague`);

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

    const mainPatients = patientsByPsy[psychologistId];
    const totalRecords = Math.min(mainPatients.length, 20) * CLINICAL_RECORDS_PER_PATIENT;
    console.log(`Creating ~${totalRecords} clinical records (${CLINICAL_RECORDS_PER_PATIENT} per patient, first 20 patients)...`);

    const recordValues = mainPatients.slice(0, 20).flatMap((patientId) =>
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

    const scenarioLabel = scenarioDay.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    console.log("─────────────────────────────────────────────");
    console.log(
        `Login principal: ${MAIN_USER.email}` +
            (targetUser.created ? ` / ${MAIN_USER.password} (conta criada agora)` : " (conta já existia, senha mantida)")
    );
    console.log("Logins das colegas (senha: " + SEED_PASSWORD + "):");
    for (const spec of COLLEAGUES) console.log(`  ${spec.name.padEnd(22)} ${spec.email}`);
    console.log(`\nCenários de sala em ${SHARED_CLINIC_NAME}, ${scenarioLabel}:`);
    console.log("  09:00  Ana na Sala 1 → a principal pode usar Sala 2 ou 3");
    console.log("  14:00  Ana, Bruno e Carla ocupam as 3 salas → sem sala para a principal (online continua livre)");
    console.log("  16:00  principal na Sala 1 e Bruno na Sala 2 → mesmo horário, salas diferentes");
    console.log("─────────────────────────────────────────────");
    console.log("Seed complete!\n");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
