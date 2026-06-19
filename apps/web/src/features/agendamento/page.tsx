import { useState, useMemo, useCallback } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import {
    Plus,
    RefreshCw,
    CalendarDays
} from "lucide-react";
import { StatsCards } from "./components/stats-cards";
import { NewAppointmentForm } from "./components/appointment-form";
import { AppSheet } from "@/components/layout/app-sheet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { type Appointment, type AppointmentStatus } from "./types";
import { useSession } from "@/lib/auth-client";

import { CalendarDashboard, type ViewMode } from "./components/calendar-dashboard";

function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatWeekRange(date: Date): string {
    const monday = getMonday(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const start = monday.toLocaleDateString("pt-BR", opts);
    const end = sunday.toLocaleDateString("pt-BR", opts);
    return `${start} — ${end}`;
}

function formatMonthLabel(date: Date): string {
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatDayLabel(date: Date): string {
    return date.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function AgendamentoPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [view, setView] = useState<ViewMode>("semana");
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [pendingCreationDate, setPendingCreationDate] = useState<Date | null>(null);

    const { data: session } = useSession();

    const isReadOnly = useMemo(() => {
        if (!editingAppointment) return false;
        if (!session?.user?.id) return false;
        return editingAppointment.psychologistId !== session.user.id;
    }, [editingAppointment, session]);

    // Query appointments from the real database
    const { data: dbAppointments, refetch } = trpc.appointment.list.useQuery(undefined, {
        retry: false,
    });

    const createMutation = trpc.appointment.create.useMutation({
        onSuccess: () => {
            toast.success("Agendamento criado com sucesso!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao criar: ${err.message}`);
        },
    });

    const updateMutation = trpc.appointment.update.useMutation({
        onSuccess: () => {
            toast.success("Agendamento atualizado com sucesso!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar: ${err.message}`);
        },
    });

    const deleteMutation = trpc.appointment.delete.useMutation({
        onSuccess: () => {
            toast.success("Agendamento excluído com sucesso!");
            refetch();
        },
        onError: (err) => {
            toast.error(`Erro ao excluir: ${err.message}`);
        },
    });

    const { data: isConnectedGoogle } = trpc.appointment.isConnectedGoogle.useQuery(undefined, {
        retry: false,
    });
    const { data: googleAuthUrlData } = trpc.appointment.getGoogleAuthUrl.useQuery(undefined, {
        retry: false,
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const syncGoogleMutation = trpc.appointment.syncGoogle.useMutation({
        onSuccess: (data) => {
            toast.success(`Google Agenda sincronizado! Importados: ${data.imported}, Ignorados: ${data.skipped}`);
            refetch();
            setIsSyncing(false);
        },
        onError: (err) => {
            toast.error(`Erro ao sincronizar: ${err.message}`);
            setIsSyncing(false);
        },
    });

    // Map DB appointments to the format expected by the frontend calendar views
    const mappedAppointments: Appointment[] = useMemo(() => {
        return (dbAppointments || []).map((app) => {
            let status: AppointmentStatus = "pendente";
            if (app.status === "confirmed") status = "confirmado";
            else if (app.status === "cancelled") status = "cancelado";
            else if (app.status === "completed") status = "concluido";
            else if (app.status === "pending") status = "pendente";
            else if (app.status === "confirmado") status = "confirmado";
            else if (app.status === "pendente") status = "pendente";
            else if (app.status === "cancelado") status = "cancelado";
            else if (app.status === "concluido") status = "concluido";

            return {
                id: app.id,
                psychologistId: app.psychologistId,
                psychologist: app.psychologist ? {
                    id: app.psychologist.id,
                    name: app.psychologist.name,
                    email: app.psychologist.email,
                } : undefined,
                patient: {
                    id: app.patient?.id ?? "",
                    name: app.patient?.nome ?? "Consulta reservada",
                    email: app.patient?.email ?? "",
                    phone: app.patient?.telefone ?? "",
                    initials: (app.patient?.nome ?? "")
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "CR",
                },
                date: new Date(app.date),
                startTime: app.startTime,
                endTime: app.endTime,
                status,
                type: app.type as any,
                notes: app.notes || undefined,
                meetingUrl: app.meetingUrl || undefined,
                isRecurring: app.isRecurring,
                sessionType: app.sessionType as any,
                reminderEnabled: app.reminderEnabled ?? false,
                reminderMinutesBefore: app.reminderMinutesBefore ?? null,
                reminderSentAt: app.reminderSentAt ?? null,
            };
        });
    }, [dbAppointments]);

    const handleSaveAppointment = async (formData: any) => {
        try {
            if (editingAppointment) {
                await updateMutation.mutateAsync({
                    id: editingAppointment.id,
                    patientId: formData.patientId,
                    date: new Date(formData.date),
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    status: formData.status,
                    sessionType: formData.sessionType,
                    type: formData.type,
                    isRecurring: formData.isRecurring,
                    notes: formData.notes,
                    meetingUrl: formData.meetingUrl || undefined,
                    reminderEnabled: formData.reminderEnabled,
                    reminderMinutesBefore: formData.reminderEnabled ? formData.reminderMinutesBefore : undefined,
                });
            } else {
                await createMutation.mutateAsync({
                    patientId: formData.patientId,
                    date: new Date(formData.date),
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    status: formData.status,
                    sessionType: formData.sessionType,
                    type: formData.type,
                    isRecurring: formData.isRecurring,
                    notes: formData.notes,
                    meetingUrl: formData.meetingUrl || undefined,
                    reminderEnabled: formData.reminderEnabled,
                    reminderMinutesBefore: formData.reminderEnabled ? formData.reminderMinutesBefore : undefined,
                });
            }
            setSheetOpen(false);
            setEditingAppointment(null);
        } catch (error) {
            logger.error("Failed to save appointment", error);
        }
    };

    const handleDeleteAppointment = async () => {
        if (!editingAppointment) return;
        if (window.confirm("Deseja realmente excluir este agendamento?")) {
            try {
                await deleteMutation.mutateAsync({ id: editingAppointment.id });
                setSheetOpen(false);
                setEditingAppointment(null);
            } catch (error) {
                logger.error("Failed to delete appointment", error);
            }
        }
    };

    // Event delegation on click to support opening edit form on clicking any card
    const handleCalendarClick = (e: React.MouseEvent) => {
        const card = (e.target as HTMLElement).closest("[data-appointment-id]");
        if (card) {
            const id = card.getAttribute("data-appointment-id");
            const appointment = mappedAppointments.find((a) => a.id === id);
            if (appointment) {
                setEditingAppointment(appointment);
                setSheetOpen(true);
            }
        }
    };

    const dateLabel = useMemo(() => {
        switch (view) {
            case "semana":
                return formatWeekRange(selectedDate);
            case "mes":
                return formatMonthLabel(selectedDate);
            case "dia":
                return formatDayLabel(selectedDate);
        }
    }, [selectedDate, view]);

    const navigate = useCallback(
        (direction: -1 | 1) => {
            setSelectedDate((prev) => {
                const d = new Date(prev);
                switch (view) {
                    case "semana":
                        d.setDate(d.getDate() + direction * 7);
                        break;
                    case "mes":
                        d.setMonth(d.getMonth() + direction);
                        break;
                    case "dia":
                        d.setDate(d.getDate() + direction);
                        break;
                }
                return d;
            });
        },
        [view]
    );

    const goToToday = useCallback(() => {
        setSelectedDate(new Date());
    }, []);

    const handleMonthDayClick = useCallback((date: Date) => {
        setPendingCreationDate(date);
        setEditingAppointment(null);
        setSheetOpen(true);
    }, []);

    return (
        <>
            <AppHeader
                title="Agendamento"
                description="Gerencie suas sessões e horários"
                icon={CalendarDays}
                actions={
                    <>
                        {isConnectedGoogle ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setIsSyncing(true);
                                    syncGoogleMutation.mutate();
                                }}
                                disabled={isSyncing}
                                className="gap-1.5"
                                id="btn-sync-google"
                            >
                                <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
                                {isSyncing ? "Sincronizando..." : "Sincronizar Agenda"}
                            </Button>
                        ) : (
                            googleAuthUrlData?.url && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        window.location.href = googleAuthUrlData.url;
                                    }}
                                    className="gap-1.5"
                                    id="btn-connect-google"
                                >
                                    <RefreshCw className="size-4" />
                                    Conectar Agenda do Google
                                </Button>
                            )
                        )}
                        <Button
                            size="sm"
                            onClick={() => {
                                setEditingAppointment(null);
                                setPendingCreationDate(null);
                                setSheetOpen(true);
                            }}
                            className="gap-1.5"
                            id="btn-new-appointment"
                        >
                            <Plus className="size-4" />
                            Novo Agendamento
                        </Button>
                        <AppSheet
                            open={isSheetOpen}
                            onOpenChange={(open) => {
                                setSheetOpen(open);
                                if (!open) {
                                    setEditingAppointment(null);
                                    setPendingCreationDate(null);
                                }
                            }}
                            title={
                                editingAppointment
                                    ? isReadOnly
                                        ? "Ver Agendamento"
                                        : "Editar Agendamento"
                                    : "Novo Agendamento"
                            }
                        >
                            <NewAppointmentForm
                                key={editingAppointment ? editingAppointment.id : "new"}
                                onSave={handleSaveAppointment}
                                onCancel={() => {
                                    setSheetOpen(false);
                                    setEditingAppointment(null);
                                    setPendingCreationDate(null);
                                }}
                                onDelete={editingAppointment && !isReadOnly ? handleDeleteAppointment : undefined}
                                readOnly={isReadOnly}
                                initialData={
                                    editingAppointment
                                        ? {
                                            id: editingAppointment.id,
                                            psychologistId: editingAppointment.psychologistId,
                                            patientId: editingAppointment.patient.id,
                                            date: editingAppointment.date,
                                            startTime: editingAppointment.startTime,
                                            endTime: editingAppointment.endTime,
                                            status:
                                                editingAppointment.status === "confirmado"
                                                    ? "confirmed"
                                                    : editingAppointment.status === "cancelado"
                                                        ? "cancelled"
                                                        : editingAppointment.status === "concluido"
                                                            ? "completed"
                                                            : "pending",
                                            sessionType: editingAppointment.sessionType || "online",
                                            type: editingAppointment.type,
                                            isRecurring: editingAppointment.isRecurring || false,
                                            notes: editingAppointment.notes || "",
                                            meetingUrl: editingAppointment.meetingUrl || "",
                                            reminderEnabled: editingAppointment.reminderEnabled ?? false,
                                            reminderMinutesBefore: editingAppointment.reminderMinutesBefore ?? undefined,
                                            reminderSentAt: editingAppointment.reminderSentAt ?? null,
                                        }
                                        : pendingCreationDate
                                            ? { date: pendingCreationDate }
                                            : undefined
                                }
                            />
                        </AppSheet>
                    </>
                }
            />

            <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 lg:p-6 overflow-hidden" onClick={handleCalendarClick}>
                {/* Stats */}
                <StatsCards appointments={mappedAppointments} />

                <CalendarDashboard
                    view={view}
                    onViewChange={setView}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    dateLabel={dateLabel}
                    onNavigate={navigate}
                    onGoToToday={goToToday}
                    appointments={mappedAppointments}
                    onDayClick={handleMonthDayClick}
                />
            </div>
        </>
    );
}
