import { Mail, Phone, CreditCard, Calendar, MapPin, Pencil, Trash2, Users, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import type { RouterOutputs } from "@/lib/trpc";

export type Patient = RouterOutputs["patient"]["list"][number];

const BIRTH_DATE = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
});

interface PatientsTableProps {
    patients: Patient[];
    isLoading?: boolean;
    onEdit: (patient: Patient) => void;
    onDelete: (id: string, name: string) => void;
    onViewProfile: (patient: Patient) => void;
}

export function PatientsTable({ patients, isLoading, onEdit, onDelete, onViewProfile }: PatientsTableProps) {
    const columns: DataTableColumn<Patient>[] = [
        {
            header: "Nome",
            className: "w-[25%]",
            render: (patient) => (
                <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground block">
                        {patient.nome}
                    </span>
                    {patient.email && (
                        <span className="text-xs text-muted-foreground block md:hidden">
                            {patient.email}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "Contato",
            className: "w-[25%]",
            render: (patient) => (
                <div className="flex flex-col gap-0.5">
                    {patient.email && (
                        <span className="flex items-center gap-1.5 text-muted-foreground text-xs md:text-sm">
                            <Mail className="size-3.5 shrink-0" />
                            {patient.email}
                        </span>
                    )}
                    {patient.telefone && (
                        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Phone className="size-3.5 shrink-0" />
                            {patient.telefone}
                        </span>
                    )}
                    {!patient.email && !patient.telefone && (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                </div>
            ),
        },
        {
            header: "CPF",
            className: "w-[14%]",
            render: (patient) => (
                <span className="font-mono text-xs flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="size-3.5" />
                    {patient.cpf || "—"}
                </span>
            ),
        },
        {
            header: "Nascimento",
            className: "w-[12%]",
            render: (patient) => (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    {patient.dataNascimento ? BIRTH_DATE.format(patient.dataNascimento) : "—"}
                </span>
            ),
        },
        {
            header: "Cidade",
            className: "w-[12%]",
            render: (patient) => (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {patient.cidade || "—"}
                </span>
            ),
        },
        {
            header: "",
            className: "w-[12%] text-right",
            render: (patient) => (
                <div className="flex justify-end items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Editar"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(patient);
                        }}
                    >
                        <Pencil className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Prontuário"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewProfile(patient);
                        }}
                    >
                        <ClipboardList className="size-3.5 text-blue-600 hover:text-blue-700 transition-colors" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Deletar"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(patient.id, patient.nome);
                        }}
                    >
                        <Trash2 className="size-3.5 transition-colors" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <DataTable
            data={patients}
            isLoading={isLoading}
            columns={columns}
            searchPlaceholder="Buscar por nome, CPF ou e-mail..."
            searchFilter={(patient, query) => {
                const term = query.toLowerCase();
                return (
                    patient.nome.toLowerCase().includes(term) ||
                    (patient.cpf ?? "").includes(term) ||
                    (patient.email ?? "").toLowerCase().includes(term)
                );
            }}
            emptyState={{
                title: "Nenhum paciente encontrado",
                description: "Não encontramos pacientes cadastrados no banco de dados. Cadastre um novo para começar.",
                icon: Users,
            }}
        />
    );
}
