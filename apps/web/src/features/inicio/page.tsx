import { useMemo } from "react";
import { addDays, differenceInCalendarDays, endOfMonth, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { Home } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import type { AppointmentStatus } from "@/features/agendamento/types";
import { StatsCards } from "./components/stats-cards";
import { UpcomingSessions } from "./components/upcoming-sessions";
import { QuickLinks } from "./components/quick-links";
import { Birthdays, type HomeBirthday } from "./components/birthdays";
import { PendingPayments, type HomePendingPayment } from "./components/pending-payments";
import { UnsignedRecords, type HomeUnsignedRecord } from "./components/unsigned-records";
import type { HomeSession } from "./types";

const MAX_UPCOMING = 8;
/** Itens por bloco da segunda linha (aniversariantes, pendentes, prontuários). */
const MAX_PER_PANEL = 5;
const BIRTHDAY_WINDOW_DAYS = 30;

// A API devolve status em inglês ou português, como na tela de agendamento.
const STATUS_MAP: Record<string, AppointmentStatus> = {
    confirmed: "confirmado",
    confirmado: "confirmado",
    pending: "pendente",
    pendente: "pendente",
    cancelled: "cancelado",
    cancelado: "cancelado",
    completed: "concluido",
    concluido: "concluido",
};

function greeting(date: Date) {
    const hour = date.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
}

export function InicioPage() {
    const { data: session } = useSession();

    const now = useMemo(() => new Date(), []);
    const todayKey = format(now, "yyyy-MM-dd");
    const monthRange = useMemo(() => ({ startDate: startOfMonth(now), endDate: endOfMonth(now) }), [now]);

    const { data: dbAppointments } = trpc.appointment.list.useQuery(undefined, { retry: false });
    const { data: dbPatients } = trpc.patient.list.useQuery(undefined, { retry: false });
    const { data: dbTransactions } = trpc.financial.list.useQuery(monthRange, { retry: false });
    // Pendências não têm período: uma cobrança de meses atrás continua pendente.
    const { data: dbAllTransactions } = trpc.financial.list.useQuery(undefined, { retry: false });
    const { data: dbRecords } = trpc.clinicalRecord.list.useQuery(undefined, { retry: false });

    const sessions: HomeSession[] = useMemo(
        () =>
            (dbAppointments ?? []).map((app) => ({
                id: app.id,
                // Mesma chave de dia das visões da agenda (data gravada em UTC).
                dayKey: new Date(app.date).toISOString().split("T")[0],
                startTime: app.startTime,
                endTime: app.endTime,
                patientName: app.patient?.nome ?? "Consulta reservada",
                status: STATUS_MAP[app.status] ?? "pendente",
                sessionType: (app.sessionType as HomeSession["sessionType"]) ?? undefined,
            })),
        [dbAppointments]
    );

    const active = sessions.filter((s) => s.status !== "cancelado");

    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(addDays(startOfWeek(now, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");

    const sessionsToday = active.filter((s) => s.dayKey === todayKey).length;
    const sessionsWeek = active.filter((s) => s.dayKey >= weekStart && s.dayKey <= weekEnd).length;

    const upcoming = active
        .filter((s) => s.dayKey >= todayKey && s.status !== "concluido")
        .sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.startTime.localeCompare(b.startTime))
        .slice(0, MAX_UPCOMING);

    const monthIncome = (dbTransactions ?? [])
        .filter((t) => t.type === "income")
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const today = useMemo(() => startOfDay(now), [now]);

    const allBirthdays: HomeBirthday[] = useMemo(() => {
        const list: HomeBirthday[] = [];
        for (const p of dbPatients ?? []) {
            if (!p.dataNascimento) continue;
            // Data de nascimento é gravada em UTC (meia-noite); lê dia/mês em UTC.
            const dob = new Date(p.dataNascimento);
            let next = new Date(today.getFullYear(), dob.getUTCMonth(), dob.getUTCDate());
            if (next < today) next = new Date(today.getFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate());
            const daysUntil = differenceInCalendarDays(next, today);
            if (daysUntil > BIRTHDAY_WINDOW_DAYS) continue;
            list.push({
                id: p.id,
                nome: p.nome,
                telefone: p.telefone,
                daysUntil,
                dayMonth: format(next, "dd/MM"),
                turningAge: next.getFullYear() - dob.getUTCFullYear(),
            });
        }
        return list.sort((a, b) => a.daysUntil - b.daysUntil);
    }, [dbPatients, today]);

    const allPending: HomePendingPayment[] = useMemo(
        () =>
            (dbAllTransactions ?? [])
                .filter((t) => t.status === "pending")
                .map((t) => {
                    const date = new Date(t.date);
                    return {
                        id: t.id,
                        type: t.type === "expense" ? ("expense" as const) : ("income" as const),
                        description: t.description,
                        patientNome: t.patientNome,
                        amount: Number(t.amount),
                        date,
                        isOverdue: startOfDay(date) < today,
                    };
                })
                // Mais antigas (e vencidas) primeiro.
                .sort((a, b) => a.date.getTime() - b.date.getTime()),
        [dbAllTransactions, today]
    );

    const totalToReceive = allPending
        .filter((p) => p.type === "income")
        .reduce((acc, p) => acc + p.amount, 0);

    const allUnsigned: HomeUnsignedRecord[] = useMemo(() => {
        const names = new Map((dbPatients ?? []).map((p) => [p.id, p.nome]));
        return (dbRecords ?? [])
            .filter((r) => r.status !== "finalized")
            .map((r) => ({
                id: r.id,
                title: r.title,
                category: r.category,
                patientId: r.patientId,
                patientNome: names.get(r.patientId) ?? "Paciente",
                dateOfService: new Date(r.dateOfService),
            }))
            .sort((a, b) => a.dateOfService.getTime() - b.dateOfService.getTime());
    }, [dbRecords, dbPatients]);

    const firstName = session?.user?.name?.split(" ")[0];

    return (
        <>
            <AppHeader
                title="Início"
                description={`${greeting(now)}${firstName ? `, ${firstName}` : ""}. Este é o resumo do seu consultório.`}
                icon={Home}
            />

            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
                <StatsCards
                    sessionsToday={sessionsToday}
                    sessionsWeek={sessionsWeek}
                    patientCount={dbPatients?.length ?? 0}
                    monthIncome={monthIncome}
                />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <UpcomingSessions sessions={upcoming} todayKey={todayKey} />
                    </div>
                    <div className="lg:col-span-1">
                        <QuickLinks />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Birthdays
                        birthdays={allBirthdays.slice(0, MAX_PER_PANEL)}
                        hiddenCount={allBirthdays.length - MAX_PER_PANEL}
                    />
                    <PendingPayments
                        payments={allPending.slice(0, MAX_PER_PANEL)}
                        hiddenCount={allPending.length - MAX_PER_PANEL}
                        totalToReceive={totalToReceive}
                    />
                    <UnsignedRecords
                        records={allUnsigned.slice(0, MAX_PER_PANEL)}
                        hiddenCount={allUnsigned.length - MAX_PER_PANEL}
                    />
                </div>
            </div>
        </>
    );
}
