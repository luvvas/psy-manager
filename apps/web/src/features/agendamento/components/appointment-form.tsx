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
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DatePicker } from "@/components/date-picker";

const appointmentSchema = z.object({
    patientId: z.string().min(1, "O paciente é obrigatório"),
    date: z.date({ required_error: "A data é obrigatória" }),
    startTime: z.string().min(1, "O horário de início é obrigatório"),
    endTime: z.string().min(1, "O horário de término é obrigatório"),
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
    sessionType: z.enum(["online", "in_person"]),
    type: z.enum(["individual", "casal", "infantil", "avaliacao"]),
    isRecurring: z.boolean(),
    notes: z.string().optional(),
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface NewAppointmentFormProps {
    onSave: (data: AppointmentFormValues) => Promise<void>;
    onCancel: () => void;
    initialData?: any;
    onDelete?: () => Promise<void>;
    readOnly?: boolean;
}

export function NewAppointmentForm({ onSave, onCancel, initialData, onDelete, readOnly = false }: NewAppointmentFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load actual patients for select dropdown
    const { data: patients } = trpc.patient.list.useQuery(undefined, {
        retry: false,
    });

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<AppointmentFormValues>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            patientId: initialData?.patientId || "",
            date: initialData?.date ? new Date(initialData.date) : new Date(),
            startTime: initialData?.startTime || "08:00",
            endTime: initialData?.endTime || "08:50",
            status: initialData?.status || "pending",
            sessionType: initialData?.sessionType || "online",
            type: initialData?.type || "individual",
            isRecurring: initialData?.isRecurring || false,
            notes: initialData?.notes || "",
        },
    });

    const onSubmitForm = async (data: AppointmentFormValues) => {
        setIsSubmitting(true);
        try {
            await onSave(data);
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

                {/* Date and Time */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="grid gap-2">
                        <Label htmlFor="date">Data</Label>
                        <Controller
                            name="date"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    date={field.value as any}
                                    setDate={field.onChange}
                                    className={readOnly ? "pointer-events-none opacity-80" : ""}
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
                            <Input id="startTime" type="time" disabled={isSubmitting || readOnly} {...register("startTime")} />
                            {errors.startTime && (
                                <p className="text-xs text-destructive">{errors.startTime.message}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="endTime">Fim</Label>
                            <Input id="endTime" type="time" disabled={isSubmitting || readOnly} {...register("endTime")} />
                            {errors.endTime && (
                                <p className="text-xs text-destructive">{errors.endTime.message}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Type & SessionType & Status in Grid */}
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
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-auto w-full">
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
        </form>
    );
}
