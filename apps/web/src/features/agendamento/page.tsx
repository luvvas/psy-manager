import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSheet } from "@/components/layout/app-sheet";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { logger } from "@/lib/logger";
import { useSession } from "@/lib/auth-client";
import type { AppointmentFormValues } from "./appointment-schema";
import type { Appointment } from "./types";
import { toAppointment, toFormInitialData } from "./mappers";
import { StatsCards } from "./components/stats-cards";
import { CalendarDashboard } from "./components/calendar-dashboard";
import { GoogleCalendarActions } from "./components/google-calendar-actions";
import { useAppointmentMutations } from "./hooks/use-appointment-mutations";
import { useCalendarNavigation } from "./hooks/use-calendar-navigation";
import { useOnlyMineFilter } from "./hooks/use-only-mine-filter";

const NewAppointmentForm = lazy(() =>
    import("./components/appointment-form").then((m) => ({ default: m.NewAppointmentForm }))
);

function sheetTitle(editing: Appointment | null, readOnly: boolean): string {
    if (!editing) return "Novo Agendamento";
    return readOnly ? "Ver Agendamento" : "Editar Agendamento";
}

export function AgendamentoPage() {
    const calendar = useCalendarNavigation();
    const [onlyMine, setOnlyMine] = useOnlyMineFilter();
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [pendingCreationDate, setPendingCreationDate] = useState<Date | null>(null);

    const { data: session } = useSession();
    const myId = session?.user?.id;
    const { data: dbAppointments, isPending: isLoadingAppointments } = trpc.appointment.list.useQuery();
    const { saveAppointment, deleteAppointment } = useAppointmentMutations();

    const appointments = useMemo(
        () => (dbAppointments ?? []).map((row) => toAppointment(row, myId)),
        [dbAppointments, myId]
    );
    const myAppointments = useMemo(() => appointments.filter((a) => a.isMine), [appointments]);
    const hasOthersAppointments = myAppointments.length < appointments.length;
    const calendarAppointments = onlyMine && myId ? myAppointments : appointments;
    const isReadOnly = !!editingAppointment && !!myId && !editingAppointment.isMine;

    const closeSheet = () => {
        setSheetOpen(false);
        setEditingAppointment(null);
        setPendingCreationDate(null);
    };

    const openNewAppointment = (date: Date | null) => {
        setEditingAppointment(null);
        setPendingCreationDate(date);
        setSheetOpen(true);
    };

    const handleSaveAppointment = async (values: AppointmentFormValues) => {
        try {
            await saveAppointment(values, editingAppointment?.id ?? null);
            setSheetOpen(false);
            setEditingAppointment(null);
        } catch (error) {
            logger.error("Erro ao salvar o agendamento", error);
        }
    };

    const handleDeleteAppointment = async () => {
        if (!editingAppointment) return;
        if (!window.confirm("Deseja realmente excluir este agendamento?")) return;
        try {
            await deleteAppointment(editingAppointment.id);
            setSheetOpen(false);
            setEditingAppointment(null);
        } catch (error) {
            logger.error("Erro ao excluir o agendamento", error);
        }
    };

    const handleCalendarClick = (e: React.MouseEvent) => {
        const card = (e.target as HTMLElement).closest("[data-appointment-id]");
        if (!card) return;
        const id = card.getAttribute("data-appointment-id");
        const appointment = appointments.find((a) => a.id === id);
        if (appointment) {
            setEditingAppointment(appointment);
            setSheetOpen(true);
        }
    };

    const handleDayClick = useCallback((date: Date) => {
        setPendingCreationDate(date);
        setEditingAppointment(null);
        setSheetOpen(true);
    }, []);

    const formInitialData = editingAppointment
        ? toFormInitialData(editingAppointment)
        : pendingCreationDate
            ? { date: pendingCreationDate }
            : undefined;

    return (
        <>
            <AppHeader
                title="Agendamento"
                description="Gerencie suas sessões e horários"
                icon={CalendarDays}
                actions={
                    <>
                        <GoogleCalendarActions />
                        <Button
                            size="sm"
                            onClick={() => openNewAppointment(null)}
                            className="gap-1.5"
                            id="btn-new-appointment"
                        >
                            <Plus className="size-4" />
                            Novo Agendamento
                        </Button>
                    </>
                }
            />

            <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 lg:p-6 overflow-hidden" onClick={handleCalendarClick}>
                <StatsCards
                    appointments={myAppointments}
                    selectedDate={calendar.selectedDate}
                    isLoading={isLoadingAppointments}
                />

                <CalendarDashboard
                    view={calendar.view}
                    onViewChange={calendar.setView}
                    selectedDate={calendar.selectedDate}
                    onDateChange={calendar.setSelectedDate}
                    dateLabel={calendar.dateLabel}
                    onNavigate={calendar.navigate}
                    onGoToToday={calendar.goToToday}
                    appointments={calendarAppointments}
                    onDayClick={handleDayClick}
                    showOwnershipFilter={hasOthersAppointments || onlyMine}
                    onlyMine={onlyMine}
                    onOnlyMineChange={setOnlyMine}
                />
            </div>

            <AppSheet
                open={isSheetOpen}
                onOpenChange={(open) => (open ? setSheetOpen(true) : closeSheet())}
                title={sheetTitle(editingAppointment, isReadOnly)}
            >
                <Suspense
                    fallback={
                        <div className="flex justify-center py-12">
                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                    }
                >
                    <NewAppointmentForm
                        key={editingAppointment ? editingAppointment.id : "new"}
                        onSave={handleSaveAppointment}
                        onCancel={closeSheet}
                        onDelete={editingAppointment && !isReadOnly ? handleDeleteAppointment : undefined}
                        readOnly={isReadOnly}
                        initialData={formInitialData}
                    />
                </Suspense>
            </AppSheet>
        </>
    );
}
