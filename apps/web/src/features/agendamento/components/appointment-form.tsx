import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Ban, Clock, DoorOpen, ExternalLink, Loader2, TriangleAlert, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { DatePicker } from "@/components/date-picker";
import { TimeInput, TIME_24H_REGEX } from "@/components/time-input";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { isHttpUrl, safeUrl } from "@/utils/safe-url";
import { useNavigate } from "react-router-dom";

const DEFAULT_SESSION_MINUTES = 50;

const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};
const toHHMM = (total: number) =>
    `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

/** Fim da sessão a partir do início e da duração, sem passar de 23:59. */
function endFor(startTime: string, minutes: number): string {
    return toHHMM(Math.min(toMinutes(startTime) + minutes, 23 * 60 + 59));
}

/** Horário atual em HH:MM e o fim padrão da sessão (+50 min, sem passar de 23:59). */
function defaultTimeRange(): { startTime: string; endTime: string } {
    const now = new Date();
    const startTime = toHHMM(now.getHours() * 60 + now.getMinutes());
    return { startTime, endTime: endFor(startTime, DEFAULT_SESSION_MINUTES) };
}

/** Meia-noite local do dia, para a chave da consulta não mudar a cada minuto. */
function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isVideoCallAvailable(date: Date, startTime: string, endTime: string): boolean {
    const now = new Date();
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const windowStart = new Date(date);
    windowStart.setHours(sh, sm, 0, 0);
    windowStart.setMinutes(windowStart.getMinutes() - 15);
    const windowEnd = new Date(date);
    windowEnd.setHours(eh, em, 0, 0);
    windowEnd.setMinutes(windowEnd.getMinutes() + 15);
    return now >= windowStart && now <= windowEnd;
}

// Valores-sentinela dos selects (o Select do Radix não aceita valor vazio).
const NO_CLINIC = "none";
const ANY_ROOM = "any";

const appointmentSchema = z.object({
    patientId: z.string().min(1, "O paciente é obrigatório"),
    date: z.date({ required_error: "A data é obrigatória" }),
    startTime: z
        .string()
        .min(1, "O horário de início é obrigatório")
        .regex(TIME_24H_REGEX, "Use o formato HH:MM (ex.: 14:30)"),
    endTime: z
        .string()
        .min(1, "O horário de término é obrigatório")
        .regex(TIME_24H_REGEX, "Use o formato HH:MM (ex.: 14:30)"),
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
    sessionType: z.enum(["online", "in_person"]),
    type: z.enum(["individual", "casal", "infantil", "avaliacao"]),
    isRecurring: z.boolean(),
    notes: z.string().optional(),
    meetingUrl: z
        .string()
        .optional()
        .refine((v) => !v || isHttpUrl(v), "Informe o link completo, começando com https://"),
    reminderEnabled: z.boolean(),
    reminderMinutesBefore: z.number().int().positive().optional(),
    clinicId: z.string(),
    roomId: z.string(),
}).refine((v) => !TIME_24H_REGEX.test(v.startTime) || !TIME_24H_REGEX.test(v.endTime) || v.startTime < v.endTime, {
    message: "O fim deve ser depois do início",
    path: ["endTime"],
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema> & {
    /** A psicóloga confirmou o conflito de horário ou a sessão fora do expediente. */
    allowScheduleConflicts?: boolean;
};

/** Dados para abrir o formulário: um agendamento existente, ou só a data clicada no calendário. */
export type AppointmentFormInitialData = Omit<Partial<AppointmentFormValues>, "clinicId" | "roomId"> & {
    id?: string;
    psychologistId?: string;
    /** null = sem clínica/sala (o form troca pelo valor "nenhuma"). */
    clinicId?: string | null;
    roomId?: string | null;
    reminderSentAt?: Date | string | null;
};

interface NewAppointmentFormProps {
    onSave: (data: AppointmentFormValues) => Promise<void>;
    onCancel: () => void;
    initialData?: AppointmentFormInitialData;
    onDelete?: () => Promise<void>;
    readOnly?: boolean;
}

export function NewAppointmentForm({ onSave, onCancel, initialData, onDelete, readOnly = false }: NewAppointmentFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: session } = useSession();

    const isOthers = session?.user?.id !== initialData?.psychologistId;
    const canStartVideo =
        !!initialData?.id &&
        initialData?.sessionType === "online" &&
        !isOthers &&
        !!initialData?.date &&
        !!initialData?.startTime &&
        !!initialData?.endTime &&
        isVideoCallAvailable(new Date(initialData.date), initialData.startTime, initialData.endTime);

    const createSession = trpc.videoSession.create.useMutation({
        onError: () => toast.error("Não foi possível iniciar a videochamada."),
    });
    const navigate = useNavigate();
    const safeMeetingUrl = safeUrl(initialData?.meetingUrl);

    async function handleStartVideo() {
        if (!initialData?.id) return; // o botão só aparece em agendamento já salvo
        if (!window.confirm("Deseja iniciar a videochamada com este paciente?")) return;
        const result = await createSession.mutateAsync({ appointmentId: initialData.id });
        // Same tab, token in router state: it must not land in the URL
        // (browser history, Sentry breadcrumbs), and a new tab would lose it.
        navigate(`/consulta/${result.sessionId}`, {
            state: { wsAuthToken: result.wsAuthToken, patientJoinUrl: result.patientJoinUrl },
        });
    }

    // Load actual patients for select dropdown
    const { data: patients } = trpc.patient.list.useQuery();

    // Calculado uma vez por abertura do formulário.
    const [defaultTimes] = useState(defaultTimeRange);

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<AppointmentFormValues>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            patientId: initialData?.patientId || "",
            date: initialData?.date ? new Date(initialData.date) : new Date(),
            // Novo agendamento começa no horário atual; edição mantém o salvo.
            startTime: initialData?.startTime || defaultTimes.startTime,
            endTime: initialData?.endTime || defaultTimes.endTime,
            status: initialData?.status || "pending",
            sessionType: initialData?.sessionType || "online",
            type: initialData?.type || "individual",
            isRecurring: initialData?.isRecurring || false,
            notes: initialData?.notes || "",
            meetingUrl: initialData?.meetingUrl || "",
            reminderEnabled: initialData?.reminderEnabled ?? false,
            reminderMinutesBefore: initialData?.reminderMinutesBefore ?? 60,
            clinicId: initialData?.clinicId || NO_CLINIC,
            roomId: initialData?.roomId || ANY_ROOM,
        },
    });

    const sessionType = watch("sessionType");
    const [watchedDate, startTime, endTime, status, clinicId, roomId] = watch([
        "date",
        "startTime",
        "endTime",
        "status",
        "clinicId",
        "roomId",
    ]);
    const isNew = !initialData?.id;
    const day = watchedDate ? startOfDay(watchedDate) : null;

    // ── Local da sessão presencial: clínica e sala ──
    const { data: clinics } = trpc.clinic.list.useQuery(undefined, { enabled: !readOnly });
    const clinicsWithRooms = (clinics ?? []).filter((c) => c.rooms.length > 0);
    const selectedClinic = clinicsWithRooms.find((c) => c.id === clinicId) ?? null;
    // A sala vale para qualquer canal: online também pode ser atendida da sala.
    const inClinic = !!selectedClinic;
    const selectedRoomId = inClinic && roomId !== ANY_ROOM ? roomId : null;

    // Presencial de quem atende numa clínica só já começa com ela escolhida.
    // Online começa sem sala (o normal é atender de casa); escolher é opcional.
    const clinicTouched = useRef(!isNew);
    useEffect(() => {
        if (clinicTouched.current || clinicsWithRooms.length !== 1) return;
        const current = getValues("clinicId");
        if (sessionType === "in_person" && current === NO_CLINIC) setValue("clinicId", clinicsWithRooms[0].id);
        if (sessionType === "online" && current !== NO_CLINIC) setValue("clinicId", NO_CLINIC);
    }, [clinicsWithRooms, sessionType, getValues, setValue]);

    const roomScope = {
        clinicId: inClinic ? selectedClinic!.id : null,
        roomId: selectedRoomId,
    };

    // ── Agendamento rápido: horários livres do dia (expediente + sala) ──
    const { data: free } = trpc.appointment.freeSlots.useQuery(
        { date: day!, excludeId: initialData?.id, ...roomScope },
        { enabled: !!day && !readOnly }
    );
    const sessionMinutes = free?.sessionMinutes ?? null;

    // Novo agendamento: só ao abrir o formulário o horário inicial (a hora atual)
    // vira o primeiro horário livre do dia. Depois disso o horário nunca muda
    // sozinho — trocar dia/local/sala só gera aviso quando ele não está livre.
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

    function pickSlot(slot: { start: string; end: string; rooms: { id: string }[] }) {
        timesTouched.current = true;
        setValue("startTime", slot.start, { shouldValidate: true });
        setValue("endTime", slot.end, { shouldValidate: true });
        // "Qualquer sala livre": fica com a primeira sala livre naquele horário.
        if (inClinic && !selectedRoomId && slot.rooms[0]) setValue("roomId", slot.rooms[0].id);
    }

    function handleStartChange(next: string, onChange: (v: string) => void) {
        timesTouched.current = true;
        onChange(next);
        if (!TIME_24H_REGEX.test(next)) return;
        // Mantém a duração: a do expediente, ou a que a sessão já tinha.
        const prevStart = getValues("startTime");
        const prevEnd = getValues("endTime");
        const duration =
            sessionMinutes ??
            (TIME_24H_REGEX.test(prevStart) && TIME_24H_REGEX.test(prevEnd) && prevEnd > prevStart
                ? toMinutes(prevEnd) - toMinutes(prevStart)
                : DEFAULT_SESSION_MINUTES);
        setValue("endTime", endFor(next, duration), { shouldValidate: true });
    }

    // ── Avisos: agenda própria (confirmável) e sala (impede salvar) ──
    const slotValid =
        !!day && TIME_24H_REGEX.test(startTime) && TIME_24H_REGEX.test(endTime) && startTime < endTime;
    const checking = slotValid && !readOnly && status !== "cancelled";
    const { data: slotCheck } = trpc.appointment.checkSlot.useQuery(
        { date: day!, startTime, endTime, excludeId: initialData?.id, ...roomScope },
        { enabled: checking, placeholderData: (prev) => prev }
    );
    const activeCheck = checking && slotCheck && !slotCheck.unchanged ? slotCheck : null;
    const hasWarning =
        !!activeCheck && (activeCheck.conflicts.length > 0 || activeCheck.outsideSchedule === true);
    const roomBlocked = !!activeCheck && activeCheck.roomConflicts.length > 0;
    const needsRoom = inClinic && !selectedRoomId;
    const [confirmed, setConfirmed] = useState(false);
    const [confirmError, setConfirmError] = useState(false);
    const [roomError, setRoomError] = useState(false);
    // Mudou horário ou sala: a confirmação anterior não vale para o novo.
    useEffect(() => {
        setConfirmed(false);
        setConfirmError(false);
        setRoomError(false);
    }, [watchedDate, startTime, endTime, roomId, clinicId, sessionType]);

    const onSubmitForm = async (data: AppointmentFormValues) => {
        if (status !== "cancelled" && (needsRoom || roomBlocked)) {
            setRoomError(true);
            return;
        }
        if (hasWarning && !confirmed) {
            setConfirmError(true);
            return;
        }
        setIsSubmitting(true);
        try {
            await onSave({
                ...data,
                roomId: selectedRoomId ?? "",
                allowScheduleConflicts: hasWarning && confirmed,
            });
        } catch (error) {
            logger.error("Failed to save appointment", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmitForm)} className="flex flex-col h-full space-y-4">
            <div className="flex-1 space-y-4">
                {/* Patient Selection */}
                <div className="grid gap-2">
                    <Label htmlFor="patientId">Paciente</Label>
                    <Controller
                        name="patientId"
                        control={control}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={isSubmitting || readOnly}
                            >
                                <SelectTrigger id="patientId">
                                    <SelectValue placeholder="Selecione o paciente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(patients || []).map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.nome}
                                        </SelectItem>
                                    ))}
                                    {(patients || []).length === 0 && (
                                        <SelectItem value="no-patients" disabled>
                                            Nenhum paciente cadastrado
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.patientId && (
                        <p className="text-xs text-destructive">{errors.patientId.message}</p>
                    )}
                </div>

                {/* Tipo e canal: vêm antes da data porque o local muda os horários livres */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                        <Label htmlFor="type">Tipo de sessão</Label>
                        <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={isSubmitting || readOnly}
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="individual">Individual</SelectItem>
                                        <SelectItem value="casal">Casal</SelectItem>
                                        <SelectItem value="infantil">Infantil</SelectItem>
                                        <SelectItem value="avaliacao">Avaliação</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="sessionType">Canal de Atendimento</Label>
                        <Controller
                            name="sessionType"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={isSubmitting || readOnly}
                                >
                                    <SelectTrigger id="sessionType">
                                        <SelectValue placeholder="Canal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="online">Online</SelectItem>
                                        <SelectItem value="in_person">Presencial</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </div>

                {/* Local: onde a psicóloga atende, presencial ou online */}
                {clinicsWithRooms.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="clinicId">Local</Label>
                            <Controller
                                name="clinicId"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={(v) => {
                                            clinicTouched.current = true;
                                            field.onChange(v);
                                            setValue("roomId", ANY_ROOM);
                                        }}
                                        disabled={isSubmitting || readOnly}
                                    >
                                        <SelectTrigger id="clinicId" className="w-full min-w-0">
                                            <SelectValue placeholder="Local" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NO_CLINIC}>
                                                {sessionType === "online" ? "Sem sala (remoto)" : "Consultório próprio"}
                                            </SelectItem>
                                            {clinicsWithRooms.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        {inClinic && (
                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="roomId">Sala</Label>
                                <Controller
                                    name="roomId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isSubmitting || readOnly}
                                        >
                                            <SelectTrigger id="roomId" className="w-full min-w-0">
                                                <SelectValue placeholder="Sala" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={ANY_ROOM}>Qualquer sala livre</SelectItem>
                                                {selectedClinic!.rooms.map((room) => (
                                                    <SelectItem key={room.id} value={room.id}>
                                                        {room.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Date and Time */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="grid gap-2">
                        <Label htmlFor="date">Data</Label>
                        <Controller
                            name="date"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    date={field.value}
                                    setDate={field.onChange}
                                    id="date"
                                    disabled={isSubmitting || readOnly}
                                />
                            )}
                        />
                        {errors.date && (
                            <p className="text-xs text-destructive">{errors.date.message}</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="startTime">Início</Label>
                            <Controller
                                name="startTime"
                                control={control}
                                render={({ field }) => (
                                    <TimeInput
                                        id="startTime"
                                        disabled={isSubmitting || readOnly}
                                        {...field}
                                        onChange={(v) => handleStartChange(v, field.onChange)}
                                    />
                                )}
                            />
                            {errors.startTime && (
                                <p className="text-xs text-destructive">{errors.startTime.message}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="endTime">Fim</Label>
                            <Controller
                                name="endTime"
                                control={control}
                                render={({ field }) => (
                                    <TimeInput
                                        id="endTime"
                                        disabled={isSubmitting || readOnly}
                                        {...field}
                                        onChange={(v) => {
                                            timesTouched.current = true;
                                            field.onChange(v);
                                        }}
                                    />
                                )}
                            />
                            {errors.endTime && (
                                <p className="text-xs text-destructive">{errors.endTime.message}</p>
                            )}
                        </div>
                    </div>

                    {!readOnly && free && (
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="size-3.5" />
                                {inClinic
                                    ? selectedRoomId
                                        ? "Horários livres seus e da sala"
                                        : "Horários livres seus com sala disponível"
                                    : "Horários livres neste dia"}
                            </Label>
                            {!free.configured ? (
                                <p className="text-xs text-muted-foreground">
                                    Configure seu expediente em Perfil → Expediente para ver os horários livres aqui.
                                </p>
                            ) : free.slots.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    {inClinic
                                        ? "Nenhum horário do seu expediente com sala livre neste dia."
                                        : "Nenhum horário livre no expediente deste dia."}
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {free.slots.map((slot) => {
                                        const selected = slot.start === startTime && slot.end === endTime;
                                        return (
                                            <button
                                                key={slot.start}
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => pickSlot(slot)}
                                                aria-pressed={selected}
                                                title={
                                                    inClinic && slot.rooms.length > 0
                                                        ? `Livre: ${slot.rooms.map((r) => r.name).join(", ")}`
                                                        : undefined
                                                }
                                                className={cn(
                                                    "rounded-md border px-2 py-1 text-xs font-medium tabular-nums transition-colors",
                                                    selected
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "hover:border-primary hover:text-primary"
                                                )}
                                            >
                                                {slot.start}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {!readOnly && inClinic && activeCheck && (roomBlocked || needsRoom) && (
                        <div
                            role={roomBlocked ? "alert" : undefined}
                            className={cn(
                                "space-y-2 rounded-lg border p-3",
                                roomBlocked || roomError || activeCheck.freeRooms?.length === 0
                                    ? "border-destructive/50 bg-destructive/5"
                                    : "bg-muted/40"
                            )}
                        >
                            {roomBlocked ? (
                                <div className="flex gap-2 text-xs">
                                    <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
                                    <div className="space-y-1">
                                        <p>
                                            O horário das <strong>{startTime}</strong> não está livre nesta sala.
                                        </p>
                                        {activeCheck.roomConflicts.map((c) => (
                                            <p key={c.id} className="text-muted-foreground">
                                                Ocupada das {c.startTime} às {c.endTime}
                                                {c.isOwn ? " por outra sessão sua" : ` por ${c.psychologistName}`}.
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ) : activeCheck.freeRooms?.length === 0 ? (
                                <p className="flex gap-2 text-xs">
                                    <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
                                    <span>
                                        O horário das <strong>{startTime}</strong> não está livre: todas as salas estão
                                        ocupadas. Escolha outro horário.
                                    </span>
                                </p>
                            ) : (
                                <p className="flex items-center gap-2 text-xs">
                                    <DoorOpen className="size-4 shrink-0 text-muted-foreground" />
                                    Escolha a sala para este horário.
                                </p>
                            )}
                            {activeCheck.freeRooms && activeCheck.freeRooms.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">
                                        {roomBlocked ? "Outras salas livres" : "Salas livres"} às {startTime}:
                                    </span>
                                    {activeCheck.freeRooms.map((room) => (
                                        <Button
                                            key={room.id}
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-xs"
                                            disabled={isSubmitting}
                                            onClick={() => setValue("roomId", room.id)}
                                        >
                                            {room.name}
                                        </Button>
                                    ))}
                                </div>
                            )}
                            {roomError && (
                                <p className="text-xs text-destructive">
                                    {roomBlocked
                                        ? "A sala está ocupada: escolha outra sala ou outro horário para salvar."
                                        : "Escolha a sala para salvar."}
                                </p>
                            )}
                        </div>
                    )}

                    {hasWarning && (
                        <div
                            role="alert"
                            className={cn(
                                "space-y-2 rounded-lg border p-3 text-sm",
                                confirmError
                                    ? "border-destructive/50 bg-destructive/5"
                                    : "border-amber-500/40 bg-amber-500/10"
                            )}
                        >
                            <div className="flex gap-2">
                                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                <div className="space-y-1 text-xs">
                                    {activeCheck!.conflicts.length > 0 && (
                                        <>
                                            <p>
                                                O horário das <strong>{startTime}</strong> não está livre na sua agenda.
                                            </p>
                                            {activeCheck!.conflicts.map((c) => (
                                                <p key={c.id} className="text-muted-foreground">
                                                    Você já tem sessão das {c.startTime} às {c.endTime}
                                                    {c.patientName ? ` com ${c.patientName}` : ""}.
                                                </p>
                                            ))}
                                        </>
                                    )}
                                    {activeCheck!.outsideSchedule && <p>Este horário está fora do seu expediente.</p>}
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs font-medium">
                                <Switch
                                    checked={confirmed}
                                    onCheckedChange={(v) => {
                                        setConfirmed(v);
                                        setConfirmError(false);
                                    }}
                                    disabled={isSubmitting}
                                />
                                Agendar mesmo assim
                            </label>
                            {confirmError && (
                                <p className="text-xs text-destructive">
                                    Confirme acima ou escolha outro horário para salvar.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={isSubmitting || readOnly}
                            >
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                    <SelectItem value="confirmed">Confirmado</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                    <SelectItem value="completed">Concluído</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                {/* Recurring */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <Label htmlFor="isRecurring" className="text-sm font-medium">
                            Sessão recorrente
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Repetir semanalmente no mesmo horário
                        </p>
                    </div>
                    <Controller
                        name="isRecurring"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="isRecurring"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isSubmitting || readOnly}
                            />
                        )}
                    />
                </div>

                {/* Notes */}
                <div className="grid gap-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                        id="notes"
                        placeholder="Anotações sobre o agendamento..."
                        className="resize-none"
                        rows={2}
                        disabled={isSubmitting || readOnly}
                        {...register("notes")}
                    />
                </div>

                {/* External meeting URL — only for online sessions */}
                {sessionType === "online" && (
                    <div className="grid gap-2">
                        <Label htmlFor="meetingUrl">Link da videochamada (opcional)</Label>
                        <Input
                            id="meetingUrl"
                            type="url"
                            placeholder="https://meet.google.com/... ou zoom.us/..."
                            disabled={isSubmitting || readOnly}
                            {...register("meetingUrl")}
                        />
                        {errors.meetingUrl && (
                            <p className="text-xs text-destructive">{errors.meetingUrl.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Cole aqui o link do Google Meet, Zoom ou Teams gerado externamente.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-auto space-y-3">
                {canStartVideo && safeMeetingUrl ? (
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-1.5"
                        onClick={() => window.open(safeMeetingUrl, "_blank", "noopener")}
                    >
                        <ExternalLink className="size-4" />
                        Entrar na videochamada
                    </Button>
                ) : canStartVideo ? (
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-1.5"
                        onClick={handleStartVideo}
                        disabled={createSession.isPending}
                    >
                        {createSession.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Video className="size-4" />
                        )}
                        Iniciar videochamada
                    </Button>
                ) : null}
                <div className="flex justify-end gap-2 border-t pt-3 w-full">
                    {onDelete && !readOnly && (
                        <Button type="button" variant="destructive" onClick={onDelete} className="mr-auto">
                            Excluir
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        {readOnly ? "Fechar" : "Cancelar"}
                    </Button>
                    {!readOnly && (
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Salvar
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
