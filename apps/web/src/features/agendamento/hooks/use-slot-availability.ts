import { useEffect, useMemo, useRef } from "react";
import { useWatch, type Control, type UseFormGetValues, type UseFormSetValue } from "react-hook-form";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { TIME_24H_REGEX } from "@/components/time-input";
import { ANY_ROOM, NO_CLINIC, type AppointmentFormValues } from "../appointment-schema";
import { startOfDay } from "../lib/dates";
import { DEFAULT_SESSION_MINUTES, endFor, toMinutes } from "../lib/time";

export type ClinicWithRooms = RouterOutputs["clinic"]["list"][number];
export type FreeSlots = RouterOutputs["appointment"]["freeSlots"];
export type FreeSlot = FreeSlots["slots"][number];
export type SlotCheck = RouterOutputs["appointment"]["checkSlot"];

interface UseSlotAvailabilityOptions {
    control: Control<AppointmentFormValues>;
    setValue: UseFormSetValue<AppointmentFormValues>;
    getValues: UseFormGetValues<AppointmentFormValues>;
    appointmentId?: string;
    readOnly: boolean;
}

const WATCHED_FIELDS = ["date", "startTime", "endTime", "status", "sessionType", "clinicId", "roomId"] as const;

export function useSlotAvailability({ control, setValue, getValues, appointmentId, readOnly }: UseSlotAvailabilityOptions) {
    const [watchedDate, startTime, endTime, status, sessionType, clinicId, roomId] = useWatch({
        control,
        name: WATCHED_FIELDS,
    });
    const isNew = !appointmentId;
    const day = watchedDate ? startOfDay(watchedDate) : null;

    const { data: clinics } = trpc.clinic.list.useQuery(undefined, { enabled: !readOnly });
    const clinicsWithRooms = useMemo(() => (clinics ?? []).filter((c) => c.rooms.length > 0), [clinics]);
    const selectedClinic = clinicsWithRooms.find((c) => c.id === clinicId) ?? null;
    const inClinic = !!selectedClinic;
    const selectedRoomId = inClinic && roomId !== ANY_ROOM ? roomId : null;

    const clinicTouched = useRef(!isNew);
    useEffect(() => {
        if (clinicTouched.current || clinicsWithRooms.length !== 1) return;
        const current = getValues("clinicId");
        if (sessionType === "in_person" && current === NO_CLINIC) setValue("clinicId", clinicsWithRooms[0].id);
        if (sessionType === "online" && current !== NO_CLINIC) setValue("clinicId", NO_CLINIC);
    }, [clinicsWithRooms, sessionType, getValues, setValue]);

    const roomScope = {
        clinicId: selectedClinic?.id ?? null,
        roomId: selectedRoomId,
    };

    const { data: free } = trpc.appointment.freeSlots.useQuery(
        { date: day!, excludeId: appointmentId, ...roomScope },
        { enabled: !!day && !readOnly }
    );
    const sessionMinutes = free?.sessionMinutes ?? null;

    const timesTouched = useRef(!isNew);
    const firstFreeApplied = useRef(false);
    useEffect(() => {
        if (timesTouched.current || firstFreeApplied.current || !free?.configured) return;
        firstFreeApplied.current = true;
        const first = free.slots[0];
        if (first) {
            setValue("startTime", first.start);
            setValue("endTime", first.end);
        } else {
            setValue("endTime", endFor(getValues("startTime"), free.sessionMinutes));
        }
    }, [free, setValue, getValues]);

    function pickSlot(slot: FreeSlot) {
        timesTouched.current = true;
        setValue("startTime", slot.start, { shouldValidate: true });
        setValue("endTime", slot.end, { shouldValidate: true });
        if (inClinic && !selectedRoomId && slot.rooms[0]) setValue("roomId", slot.rooms[0].id);
    }

    function handleStartChange(next: string, onChange: (v: string) => void) {
        timesTouched.current = true;
        onChange(next);
        if (!TIME_24H_REGEX.test(next)) return;
        const prevStart = getValues("startTime");
        const prevEnd = getValues("endTime");
        const duration =
            sessionMinutes ??
            (TIME_24H_REGEX.test(prevStart) && TIME_24H_REGEX.test(prevEnd) && prevEnd > prevStart
                ? toMinutes(prevEnd) - toMinutes(prevStart)
                : DEFAULT_SESSION_MINUTES);
        setValue("endTime", endFor(next, duration), { shouldValidate: true });
    }

    function handleEndChange(next: string, onChange: (v: string) => void) {
        timesTouched.current = true;
        onChange(next);
    }

    function handleClinicChange(next: string, onChange: (v: string) => void) {
        clinicTouched.current = true;
        onChange(next);
        setValue("roomId", ANY_ROOM);
    }

    const slotValid =
        !!day && TIME_24H_REGEX.test(startTime) && TIME_24H_REGEX.test(endTime) && startTime < endTime;
    const checking = slotValid && !readOnly && status !== "cancelled";
    const { data: slotCheck } = trpc.appointment.checkSlot.useQuery(
        { date: day!, startTime, endTime, excludeId: appointmentId, ...roomScope },
        { enabled: checking, placeholderData: (prev) => prev }
    );
    const activeCheck = checking && slotCheck && !slotCheck.unchanged ? slotCheck : null;
    const hasWarning =
        !!activeCheck && (activeCheck.conflicts.length > 0 || activeCheck.outsideSchedule === true);
    const roomBlocked = !!activeCheck && activeCheck.roomConflicts.length > 0;
    const needsRoom = inClinic && !selectedRoomId;
    const slotKey = [day?.getTime() ?? "", startTime, endTime, roomId, clinicId, sessionType].join("|");

    return {
        startTime,
        endTime,
        status,
        sessionType,
        clinicsWithRooms,
        selectedClinic,
        inClinic,
        selectedRoomId,
        free,
        activeCheck,
        hasWarning,
        roomBlocked,
        needsRoom,
        slotKey,
        pickSlot,
        handleStartChange,
        handleEndChange,
        handleClinicChange,
    };
}
