/// <reference types="bun" />

import { expect, mock } from "bun:test";

export const USER_ID = "user-123";

export const state = {
    patientById: undefined as any,
    documentById: undefined as any,
    clinicalRecordById: undefined as any,
    videoSessionById: undefined as any,
    validatedVideoSession: undefined as any,
    googleAccountRows: [] as any[],
    ownedPatientRows: [{ id: "patient-1" }] as any[],
    clinicUpdateResult: undefined as any,
    clinicDeleteResult: undefined as any,
    clinicLinkError: null as Error | null,
    clinicUnlinkError: null as Error | null,
    documentUpdateError: null as Error | null,
    documentDeleteError: null as Error | null,
    clinicalRecordCreateError: null as Error | null,
    clinicalRecordUpdateError: null as Error | null,
    clinicalRecordFinalizeError: null as Error | null,
    clinicalRecordDeleteError: null as Error | null,
};

export const patientCommands = {
    create: mock(async () => "patient-1"),
    update: mock(async () => undefined),
    delete: mock(async () => undefined),
};

export const patientQueries = {
    list: mock(async () => [{ id: "patient-1" }]),
    findById: mock(async () => state.patientById),
};

export const appointmentCommands = {
    schedule: mock(async () => "appointment-1"),
    reschedule: mock(async () => undefined),
    cancel: mock(async () => undefined),
};

export const appointmentQueries = {
    list: mock(async () => [{ id: "appointment-1" }]),
};

export const psychologistService = {
    getById: mock(async () => ({ id: USER_ID })),
    updateProfile: mock(async (_id: string, data: any) => ({ id: USER_ID, ...data })),
    list: mock(async () => [{ id: USER_ID }]),
};

export const clinicService = {
    list: mock(async () => [{ id: "clinic-1" }]),
    create: mock(async (_userId: string, data: any) => ({ id: "clinic-1", ...data })),
    update: mock(async (_userId: string, id: string, data: any) =>
        state.clinicUpdateResult === undefined ? { id, ...data } : state.clinicUpdateResult
    ),
    delete: mock(async () =>
        state.clinicDeleteResult === undefined ? { success: true } : state.clinicDeleteResult
    ),
    linkPsychologist: mock(async () => {
        if (state.clinicLinkError) throw state.clinicLinkError;
        return { success: true };
    }),
    unlinkPsychologist: mock(async () => {
        if (state.clinicUnlinkError) throw state.clinicUnlinkError;
        return { success: true };
    }),
};

export const financialService = {
    list: mock(async () => [{ id: "transaction-1" }]),
    create: mock(async (_userId: string, data: any) => ({ id: "transaction-1", ...data })),
    createMany: mock(async (_userId: string, data: any[]) => ({ count: data.length })),
    update: mock(async (_userId: string, id: string, data: any) => ({ id, ...data })),
    delete: mock(async () => ({ success: true })),
};

export const documentService = {
    list: mock(async () => [{ id: "document-1" }]),
    getById: mock(async () => state.documentById),
    create: mock(async (_userId: string, data: any) => ({ id: "document-1", ...data })),
    update: mock(async (_userId: string, id: string, data: any) => {
        if (state.documentUpdateError) throw state.documentUpdateError;
        return { id, ...data };
    }),
    delete: mock(async () => {
        if (state.documentDeleteError) throw state.documentDeleteError;
        return { success: true };
    }),
};

export const clinicalRecordService = {
    list: mock(async () => [{ id: "record-1" }]),
    getById: mock(async () => state.clinicalRecordById),
    create: mock(async (_userId: string, data: any) => {
        if (state.clinicalRecordCreateError) throw state.clinicalRecordCreateError;
        return { id: "record-1", ...data };
    }),
    update: mock(async (_userId: string, id: string, data: any) => {
        if (state.clinicalRecordUpdateError) throw state.clinicalRecordUpdateError;
        return { id, ...data };
    }),
    finalize: mock(async (_userId: string, id: string) => {
        if (state.clinicalRecordFinalizeError) throw state.clinicalRecordFinalizeError;
        return { id, status: "finalized" };
    }),
    delete: mock(async () => {
        if (state.clinicalRecordDeleteError) throw state.clinicalRecordDeleteError;
        return { success: true };
    }),
};

export const storageService = {
    createUploadTarget: mock(async (_userId: string, input: any) => ({
        driver: "local",
        storageKey: `documents/${USER_ID}/${input.fileName}`,
        uploadUrl: "/api/storage/local-upload/token",
        method: "PUT",
        headers: { "Content-Type": input.contentType },
    })),
    createReadUrl: mock(async (storageKey: string) => `/api/storage/local-download/${storageKey}`),
};

export const googleCalendarService = {
    isConnected: mock(async () => true),
    syncEvents: mock(async () => ({ imported: 1, skipped: 0 })),
};

export const videoSessionService = {
    create: mock(async () => ({ id: "video-1", patientToken: "patient-token" })),
    getById: mock(async () => state.videoSessionById),
    end: mock(async () => ({ success: true })),
    validateToken: mock(async () => state.validatedVideoSession),
};

export const createAuthToken = mock(() => "ws-auth-token");

const dbQuery = {
    where: mock(() => ({
        limit: mock(async () => state.ownedPatientRows),
        then: (resolve: any, reject: any) => Promise.resolve(state.googleAccountRows).then(resolve, reject),
    })),
};
const dbSelectFrom = mock(() => dbQuery);
const dbSelect = mock(() => ({ from: dbSelectFrom }));
const dbUpdateWhere = mock(async () => undefined);
export const dbUpdateSet = mock(() => ({ where: dbUpdateWhere }));
const dbUpdate = mock(() => ({ set: dbUpdateSet }));
export const dbInsertValues = mock(async () => undefined);
const dbInsert = mock(() => ({ values: dbInsertValues }));
export const dbMock = {
    select: dbSelect,
    update: dbUpdate,
    insert: dbInsert,
};

export const tokenFetch = mock(async () =>
    new Response(
        JSON.stringify({
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
    )
);

const allMocks = [
    ...Object.values(patientCommands),
    ...Object.values(patientQueries),
    ...Object.values(appointmentCommands),
    ...Object.values(appointmentQueries),
    ...Object.values(psychologistService),
    ...Object.values(clinicService),
    ...Object.values(financialService),
    ...Object.values(documentService),
    ...Object.values(clinicalRecordService),
    ...Object.values(storageService),
    ...Object.values(googleCalendarService),
    ...Object.values(videoSessionService),
    createAuthToken,
    dbQuery.where,
    dbSelectFrom,
    dbSelect,
    dbUpdateWhere,
    dbUpdateSet,
    dbUpdate,
    dbInsertValues,
    dbInsert,
    tokenFetch,
];

mock.module("../../src/cqrs/patient/patient.commands", () => ({ patientCommands }));
mock.module("../../src/cqrs/patient/patient.queries", () => ({ patientQueries }));
mock.module("../../src/cqrs/appointment/appointment.commands", () => ({ appointmentCommands }));
mock.module("../../src/cqrs/appointment/appointment.queries", () => ({ appointmentQueries }));
mock.module("../../src/services/psychologist.service", () => ({ psychologistService }));
mock.module("../../src/services/clinic.service", () => ({ clinicService }));
mock.module("../../src/services/financial.service", () => ({ financialService }));
mock.module("../../src/services/document.service", () => ({ documentService }));
mock.module("../../src/services/clinical-record.service", () => ({ clinicalRecordService }));
mock.module("../../src/services/storage.service", () => ({ storageService }));
mock.module("../../src/services/google-calendar.service", () => ({ googleCalendarService }));
mock.module("../../src/services/video-session.service", () => ({ videoSessionService }));
mock.module("../../src/ws/rooms", () => ({ createAuthToken }));
mock.module("../../src/db", () => ({ db: dbMock }));

const [{ appRouter }, { createCallerFactory }] = await Promise.all([
    import("../../src/routes/router"),
    import("../../src/trpc/index"),
]);

const createCaller = createCallerFactory(appRouter) as (ctx: any) => any;

export function authContext() {
    return {
        db: dbMock,
        session: {
            user: {
                id: USER_ID,
                name: "Test User",
                email: "user@example.com",
            },
        },
    } as any;
}

export function anonymousContext() {
    return { db: dbMock, session: null } as any;
}

export function caller() {
    return createCaller(authContext());
}

export function anonymousCaller() {
    return createCaller(anonymousContext());
}

export function callerWithId(userId: string) {
    return createCaller({
        db: dbMock,
        session: {
            user: { id: userId, name: "Other User", email: "other@example.com" },
        },
    } as any);
}

export function resetRouterTestState() {
    for (const fn of allMocks) {
        fn.mockClear();
    }

    state.patientById = { id: "patient-1", nome: "Ana Silva" };
    state.documentById = { id: "document-1", content: "inline-content" };
    state.clinicalRecordById = { id: "record-1", fileUrl: "inline-file" };
    state.videoSessionById = {
        id: "video-1",
        psychologistId: USER_ID,
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
    };
    state.validatedVideoSession = {
        id: "video-1",
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
        psychologistName: "Ana",
    };
    state.googleAccountRows = [];
    state.ownedPatientRows = [{ id: "patient-1" }];
    state.clinicUpdateResult = undefined;
    state.clinicDeleteResult = undefined;
    state.clinicLinkError = null;
    state.clinicUnlinkError = null;
    state.documentUpdateError = null;
    state.documentDeleteError = null;
    state.clinicalRecordCreateError = null;
    state.clinicalRecordUpdateError = null;
    state.clinicalRecordFinalizeError = null;
    state.clinicalRecordDeleteError = null;
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:5173/google-callback";
    process.env.PUBLIC_URL = "http://localhost:5173";
    globalThis.fetch = tokenFetch as unknown as typeof fetch;
}

export function callArg(fn: any, callIndex = 0, argIndex = 0) {
    const call = fn.mock.calls[callIndex] as unknown[] | undefined;
    expect(call).toBeDefined();
    return call![argIndex];
}

export function patientInput(overrides: Record<string, unknown> = {}) {
    return {
        nome: "Ana Silva",
        email: "ana@example.com",
        telefone: "11999999999",
        dataNascimento: "1990-01-02T00:00:00.000Z",
        cidade: "Sao Paulo",
        cpf: "12345678900",
        ...overrides,
    };
}

export function appointmentInput(overrides: Record<string, unknown> = {}) {
    return {
        patientId: "patient-1",
        date: "2026-05-20T12:00:00.000Z",
        startTime: "09:00",
        endTime: "10:00",
        status: "confirmed",
        sessionType: "online",
        type: "individual",
        isRecurring: false,
        notes: "Initial session",
        ...overrides,
    };
}

export function clinicInput(overrides: Record<string, unknown> = {}) {
    return {
        name: "Clinica Centro",
        cnpj: "12345678000199",
        phone: "1133333333",
        email: "clinic@example.com",
        address: "Rua Um, 10",
        city: "Sao Paulo",
        ...overrides,
    };
}

export function transactionInput(overrides: Record<string, unknown> = {}) {
    return {
        type: "income" as const,
        description: "Session",
        amount: "150.00",
        date: "2026-05-10T00:00:00.000Z",
        category: "Consultas",
        patientId: "patient-1",
        status: "paid",
        ...overrides,
    };
}

export function documentInput(overrides: Record<string, unknown> = {}) {
    return {
        title: "Contract",
        content: "Document content",
        type: "contrato",
        category: "legal",
        isTemplate: false,
        patientId: "patient-1",
        ...overrides,
    };
}

export function clinicalRecordInput(overrides: Record<string, unknown> = {}) {
    return {
        title: "Evolution",
        patientId: "patient-1",
        category: "evolucao",
        textContent: "Clinical notes",
        dateOfService: new Date("2026-05-10T00:00:00.000Z"),
        ...overrides,
    };
}
