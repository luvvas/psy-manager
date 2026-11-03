import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    appointmentSchema,
    SESSION_TYPE_OPTIONS,
    STATUS_OPTIONS,
    toFormDefaultValues,
    TYPE_OPTIONS,
    type AppointmentFormInitialData,
    type AppointmentFormValues,
} from "../appointment-schema";
import { useSlotAvailability } from "../hooks/use-slot-availability";
import { defaultTimeRange, isVideoCallAvailable } from "../lib/time";
import { DateTimeFields } from "./date-time-fields";
import { FieldError, FormSelectField } from "./form-select-field";
import { LocationFields } from "./location-fields";
import { FreeSlotsPicker } from "./free-slots-picker";
import { RoomWarning, ScheduleWarning } from "./slot-warnings";
import { VideoCallButton } from "./video-call-button";

interface NewAppointmentFormProps {
    onSave: (data: AppointmentFormValues) => Promise<void>;
    onCancel: () => void;
    initialData?: AppointmentFormInitialData;
    onDelete?: () => Promise<void>;
    readOnly?: boolean;
}

type SlotError = { key: string; kind: "room" | "confirm" };

function videoCallAppointmentId(initialData: AppointmentFormInitialData | undefined): string | null {
    if (!initialData?.id || initialData.sessionType !== "online" || !initialData.isMine) return null;
    if (!initialData.date || !initialData.startTime || !initialData.endTime) return null;
    const available = isVideoCallAvailable(new Date(initialData.date), initialData.startTime, initialData.endTime);
    return available ? initialData.id : null;
}

export function NewAppointmentForm({ onSave, onCancel, initialData, onDelete, readOnly = false }: NewAppointmentFormProps) {
    const videoAppointmentId = videoCallAppointmentId(initialData);

    const { data: patients } = trpc.patient.list.useQuery();
    const patientOptions = useMemo(
        () => (patients ?? []).map((p) => ({ value: p.id, label: p.nome })),
        [patients]
    );

    const [defaultValues] = useState(() => toFormDefaultValues(initialData, defaultTimeRange()));
    const {
        register,
        handleSubmit,
        control,
        setValue,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<AppointmentFormValues>({
        resolver: zodResolver(appointmentSchema),
        defaultValues,
    });

    const slot = useSlotAvailability({ control, setValue, getValues, appointmentId: initialData?.id, readOnly });
    const { startTime, endTime, status, sessionType, activeCheck, hasWarning, roomBlocked, needsRoom, slotKey } = slot;

    const [confirmedFor, setConfirmedFor] = useState<string | null>(null);
    const [errorFor, setErrorFor] = useState<SlotError | null>(null);
    const confirmed = confirmedFor === slotKey;
    const roomError = errorFor?.key === slotKey && errorFor.kind === "room";
    const confirmError = errorFor?.key === slotKey && errorFor.kind === "confirm";
    const disabled = isSubmitting || readOnly;

    const onSubmitForm = async (data: AppointmentFormValues) => {
        if (status !== "cancelled" && (needsRoom || roomBlocked)) {
            setErrorFor({ key: slotKey, kind: "room" });
            return;
        }
        if (hasWarning && !confirmed) {
            setErrorFor({ key: slotKey, kind: "confirm" });
            return;
        }
        try {
            await onSave({
                ...data,
                roomId: slot.selectedRoomId ?? "",
                allowScheduleConflicts: hasWarning && confirmed,
            });
        } catch (error) {
            logger.error("Erro ao salvar o agendamento", error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmitForm)} className="flex flex-col h-full space-y-4">
            <div className="flex-1 space-y-4">
                <FormSelectField
                    control={control}
                    name="patientId"
                    label="Paciente"
                    placeholder="Selecione o paciente"
                    options={patientOptions}
                    disabled={disabled}
                    emptyLabel="Nenhum paciente cadastrado"
                    error={errors.patientId?.message}
                />

                <div className="grid grid-cols-2 gap-3">
                    <FormSelectField
                        control={control}
                        name="type"
                        label="Tipo de sessão"
                        placeholder="Tipo"
                        options={TYPE_OPTIONS}
                        disabled={disabled}
                    />
                    <FormSelectField
                        control={control}
                        name="sessionType"
                        label="Canal de Atendimento"
                        placeholder="Canal"
                        options={SESSION_TYPE_OPTIONS}
                        disabled={disabled}
                    />
                </div>

                {slot.clinicsWithRooms.length > 0 && (
                    <LocationFields
                        control={control}
                        sessionType={sessionType}
                        clinics={slot.clinicsWithRooms}
                        selectedClinic={slot.selectedClinic}
                        disabled={disabled}
                        onClinicChange={slot.handleClinicChange}
                    />
                )}

                <div className="grid grid-cols-1 gap-3">
                    <DateTimeFields
                        control={control}
                        errors={errors}
                        disabled={disabled}
                        onStartChange={slot.handleStartChange}
                        onEndChange={slot.handleEndChange}
                    />

                    {!readOnly && slot.free && (
                        <FreeSlotsPicker
                            free={slot.free}
                            inClinic={slot.inClinic}
                            hasSelectedRoom={!!slot.selectedRoomId}
                            startTime={startTime}
                            endTime={endTime}
                            disabled={isSubmitting}
                            onPick={slot.pickSlot}
                        />
                    )}

                    {!readOnly && slot.inClinic && activeCheck && (roomBlocked || needsRoom) && (
                        <RoomWarning
                            check={activeCheck}
                            startTime={startTime}
                            roomBlocked={roomBlocked}
                            showError={roomError}
                            disabled={isSubmitting}
                            onPickRoom={(roomId) => setValue("roomId", roomId)}
                        />
                    )}

                    {hasWarning && activeCheck && (
                        <ScheduleWarning
                            check={activeCheck}
                            startTime={startTime}
                            confirmed={confirmed}
                            showError={confirmError}
                            disabled={isSubmitting}
                            onConfirmedChange={(v) => {
                                setConfirmedFor(v ? slotKey : null);
                                if (confirmError) setErrorFor(null);
                            }}
                        />
                    )}
                </div>

                <FormSelectField
                    control={control}
                    name="status"
                    label="Status"
                    placeholder="Status"
                    options={STATUS_OPTIONS}
                    disabled={disabled}
                />

                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <Label htmlFor="isRecurring" className="text-sm font-medium">
                            Sessão recorrente
                        </Label>
                        <p className="text-xs text-muted-foreground">Repetir semanalmente no mesmo horário</p>
                    </div>
                    <Controller
                        name="isRecurring"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="isRecurring"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={disabled}
                            />
                        )}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                        id="notes"
                        placeholder="Anotações sobre o agendamento..."
                        className="resize-none"
                        rows={2}
                        disabled={disabled}
                        {...register("notes")}
                    />
                </div>

                {sessionType === "online" && (
                    <div className="grid gap-2">
                        <Label htmlFor="meetingUrl">Link da videochamada (opcional)</Label>
                        <Input
                            id="meetingUrl"
                            type="url"
                            placeholder="https://meet.google.com/... ou zoom.us/..."
                            disabled={disabled}
                            {...register("meetingUrl")}
                        />
                        <FieldError message={errors.meetingUrl?.message} />
                        <p className="text-xs text-muted-foreground">
                            Cole aqui o link do Google Meet, Zoom ou Teams gerado externamente.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-auto space-y-3">
                {videoAppointmentId && (
                    <VideoCallButton appointmentId={videoAppointmentId} meetingUrl={initialData?.meetingUrl} />
                )}
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
