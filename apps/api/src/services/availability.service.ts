import { and, asc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "../db";
import { appointment, clinicRoom, patient, user } from "../db/schema";
import { decryptField } from "../lib/encryption";
import {
    findConflicts,
    freeSlots,
    isWithinSchedule,
    localDay,
    nowLocalMinutes,
    type WorkSchedule,
} from "../lib/work-schedule";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Regras de disponibilidade:
 * - Agenda própria (conflito com outra sessão minha, fora do expediente): só
 *   aviso — a psicóloga confirma, porque a decisão afeta só ela.
 * - Sala da clínica ocupada (por qualquer psicóloga): impedimento — é um
 *   recurso físico compartilhado e envolve outra pessoa que não concordou.
 *
 * Quem chama garante o acesso à sala/clínica (`assertRoomAccess`/`assertClinicMembership`).
 */

export interface SlotCheckInput {
    date: Date;
    startTime: string;
    endTime: string;
    /** Na edição, o próprio agendamento não conta como conflito. */
    excludeId?: string;
    /** Sala escolhida para a sessão presencial. */
    roomId?: string | null;
    /** Clínica da sessão presencial, para sugerir salas livres no horário. */
    clinicId?: string | null;
}

export interface RoomRef {
    id: string;
    name: string;
}

export interface SlotCheckResult {
    /** Outras sessões minhas no horário (aviso, confirmável). */
    conflicts: { id: string; startTime: string; endTime: string; patientName: string | null }[];
    /** Sessões que ocupam a sala escolhida no horário (impede salvar). */
    roomConflicts: { id: string; startTime: string; endTime: string; psychologistName: string; isOwn: boolean }[];
    /** Salas da clínica livres no horário; null quando a sessão não é em clínica. */
    freeRooms: RoomRef[] | null;
    /** null quando o expediente não foi configurado no perfil. */
    outsideSchedule: boolean | null;
    /** Edição que não mexeu em dia/horário/sala: nada a confirmar, mesmo que já estivesse fora da regra. */
    unchanged: boolean;
}

export interface FreeSlotsInput {
    date: Date;
    excludeId?: string;
    clinicId?: string | null;
    roomId?: string | null;
}

async function isSameSlotAsStored(psychologistId: string, input: SlotCheckInput): Promise<boolean> {
    if (!input.excludeId) return false;
    const [stored] = await db
        .select({
            date: appointment.date,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            roomId: appointment.roomId,
        })
        .from(appointment)
        .where(and(eq(appointment.id, input.excludeId), eq(appointment.psychologistId, psychologistId)))
        .limit(1);
    return (
        !!stored &&
        stored.startTime === input.startTime &&
        stored.endTime === input.endTime &&
        (stored.roomId ?? null) === (input.roomId ?? null) &&
        localDay(stored.date).key === localDay(input.date).key
    );
}

async function getSchedule(psychologistId: string): Promise<WorkSchedule | null> {
    const [row] = await db
        .select({ workSchedule: user.workSchedule })
        .from(user)
        .where(eq(user.id, psychologistId))
        .limit(1);
    return row?.workSchedule ?? null;
}

// Janela de ±1 dia no banco e filtro exato pelo dia local em memória:
// `date` guarda o instante, não o dia, e o fuso do servidor pode ser outro.
function dayWindow(date: Date) {
    return [
        gte(appointment.date, new Date(date.getTime() - DAY_MS)),
        lte(appointment.date, new Date(date.getTime() + DAY_MS)),
    ];
}

/** Sessões não canceladas do psicólogo no mesmo dia (fuso do app) que `date`. */
async function busyOnDay(psychologistId: string, date: Date, excludeId?: string) {
    const { key } = localDay(date);
    const rows = await db
        .select({
            id: appointment.id,
            date: appointment.date,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            patientName: patient.nome,
        })
        .from(appointment)
        .innerJoin(patient, eq(appointment.patientId, patient.id))
        .where(and(eq(appointment.psychologistId, psychologistId), ne(appointment.status, "cancelled"), ...dayWindow(date)));

    return rows
        .filter((r) => r.id !== excludeId && localDay(r.date).key === key)
        .map((r) => ({ ...r, patientName: decryptField(r.patientName) }));
}

/**
 * Ocupação das salas no dia, por qualquer psicóloga. Só sai horário e nome da
 * psicóloga — nada do paciente, igual à agenda compartilhada da clínica.
 */
async function roomBusyOnDay(roomIds: string[], date: Date, excludeId?: string) {
    if (roomIds.length === 0) return [];
    const { key } = localDay(date);
    const rows = await db
        .select({
            id: appointment.id,
            roomId: appointment.roomId,
            psychologistId: appointment.psychologistId,
            psychologistName: user.name,
            date: appointment.date,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
        })
        .from(appointment)
        .innerJoin(user, eq(appointment.psychologistId, user.id))
        .where(and(inArray(appointment.roomId, roomIds), ne(appointment.status, "cancelled"), ...dayWindow(date)));

    return rows.filter((r) => r.id !== excludeId && localDay(r.date).key === key);
}

async function activeRooms(clinicId: string): Promise<RoomRef[]> {
    return db
        .select({ id: clinicRoom.id, name: clinicRoom.name })
        .from(clinicRoom)
        .where(and(eq(clinicRoom.clinicId, clinicId), eq(clinicRoom.active, true)))
        .orderBy(asc(clinicRoom.name));
}

function roomsFreeAt(
    rooms: RoomRef[],
    busy: { roomId: string | null; startTime: string; endTime: string; id: string }[],
    startTime: string,
    endTime: string
): RoomRef[] {
    const taken = new Set(findConflicts(startTime, endTime, busy).map((b) => b.roomId));
    return rooms.filter((r) => !taken.has(r.id));
}

export const availabilityService = {
    async checkSlot(psychologistId: string, input: SlotCheckInput): Promise<SlotCheckResult> {
        if (await isSameSlotAsStored(psychologistId, input)) {
            return { conflicts: [], roomConflicts: [], freeRooms: null, outsideSchedule: null, unchanged: true };
        }

        const rooms = input.clinicId ? await activeRooms(input.clinicId) : [];
        const roomIds = new Set(rooms.map((r) => r.id));
        if (input.roomId) roomIds.add(input.roomId);

        const [schedule, busy, roomBusy] = await Promise.all([
            getSchedule(psychologistId),
            busyOnDay(psychologistId, input.date, input.excludeId),
            roomBusyOnDay([...roomIds], input.date, input.excludeId),
        ]);

        const roomConflicts = input.roomId
            ? findConflicts(
                  input.startTime,
                  input.endTime,
                  roomBusy.filter((b) => b.roomId === input.roomId)
              ).map((b) => ({
                  id: b.id,
                  startTime: b.startTime,
                  endTime: b.endTime,
                  psychologistName: b.psychologistName,
                  isOwn: b.psychologistId === psychologistId,
              }))
            : [];
        // Sessão minha na mesma sala já aparece como conflito de sala (o mais grave).
        const inRoom = new Set(roomConflicts.map((c) => c.id));
        const conflicts = findConflicts(input.startTime, input.endTime, busy)
            .filter((b) => !inRoom.has(b.id))
            .map(({ id, startTime, endTime, patientName }) => ({ id, startTime, endTime, patientName }));

        const outsideSchedule = schedule
            ? !isWithinSchedule(schedule, localDay(input.date).weekday, input.startTime, input.endTime)
            : null;

        return {
            conflicts,
            roomConflicts,
            freeRooms: input.clinicId ? roomsFreeAt(rooms, roomBusy, input.startTime, input.endTime) : null,
            outsideSchedule,
            unchanged: false,
        };
    },

    /**
     * Horários livres no expediente. Com sala escolhida, a ocupação dela entra
     * como "ocupado" no cálculo (os horários se ajustam em volta). Com clínica
     * e sem sala, mostra os horários em que pelo menos uma sala está livre e
     * quais estão, para o formulário escolher a sala sozinho.
     */
    async freeSlots(psychologistId: string, input: FreeSlotsInput) {
        const rooms: RoomRef[] = input.roomId
            ? (await activeRooms(input.clinicId!)).filter((r) => r.id === input.roomId)
            : input.clinicId
              ? await activeRooms(input.clinicId)
              : [];

        const [schedule, busy, roomBusy] = await Promise.all([
            getSchedule(psychologistId),
            busyOnDay(psychologistId, input.date, input.excludeId),
            roomBusyOnDay(
                rooms.map((r) => r.id),
                input.date,
                input.excludeId
            ),
        ]);
        if (!schedule) {
            return { configured: false as const, sessionMinutes: null, roomsConsidered: false, slots: [] };
        }

        const day = localDay(input.date);
        const today = localDay(new Date()).key;
        // Dia que já passou não tem horário livre; hoje só a partir de agora.
        const notBefore = day.key < today ? Infinity : day.key === today ? nowLocalMinutes() : 0;
        const base = { configured: true as const, sessionMinutes: schedule.sessionMinutes };

        // Sessão fora de clínica, ou clínica sem salas cadastradas: só a agenda própria.
        if (rooms.length === 0) {
            return {
                ...base,
                roomsConsidered: false,
                slots: freeSlots(schedule, day.weekday, busy, notBefore).map((s) => ({ ...s, rooms: [] as RoomRef[] })),
            };
        }

        if (input.roomId) {
            return {
                ...base,
                roomsConsidered: true,
                slots: freeSlots(schedule, day.weekday, [...busy, ...roomBusy], notBefore).map((s) => ({
                    ...s,
                    rooms,
                })),
            };
        }

        return {
            ...base,
            roomsConsidered: true,
            slots: freeSlots(schedule, day.weekday, busy, notBefore)
                .map((s) => ({ ...s, rooms: roomsFreeAt(rooms, roomBusy, s.start, s.end) }))
                .filter((s) => s.rooms.length > 0),
        };
    },
};
