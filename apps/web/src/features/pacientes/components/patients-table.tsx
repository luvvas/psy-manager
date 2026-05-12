import { Mail, Phone, CreditCard, Calendar, MapPin, Pencil, Trash2, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";

export interface DBPatient {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    dataNascimento: Date;
    cidade: string;
    cpf: string;
    valorSessao: string | number | null;
    modeloCobranca: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface PatientsTableProps {
    patients: DBPatient[];
    onEdit: (patient: DBPatient) => void;
    onDelete: (id: string, name: string) => void;
    onViewProfile: (patient: DBPatient) => void;
}

export function PatientsTable({ patients, onEdit, onDelete, onViewProfile }: PatientsTableProps) {
    const columns: DataTableColumn<DBPatient>[] = [
        {
            header: "Nome",
            className: "w-[28%]",
            render: (patient) => (
                <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground block">
                        {patient.nome}
                    </span>
                    <span className="text-xs text-muted-foreground block md:hidden">
                        {patient.email}
                    </span>
                </div>
            ),
        },
        {
            header: "Contato",
            className: "w-[28%]",
            render: (patient) => (
                <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs md:text-sm">
                        <Mail className="size-3.5 shrink-0" />
                        {patient.email}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Phone className="size-3.5 shrink-0" />
                        {patient.telefone}
                    </span>
                </div>
            ),
        },
        {
            header: "CPF",
            className: "w-[15%]",
            render: (patient) => (
                <span className="font-mono text-xs flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="size-3.5" />
                    {patient.cpf}
                </span>
            ),
        },
        {
            header: "Nascimento",
            className: "w-[12%]",
            render: (patient) => (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    {patient.dataNascimento.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        timeZone: "UTC"
                    })}
                </span>
            ),
        },
        {
            header: "Cidade",
            className: "w-[12%]",
            render: (patient) => (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {patient.cidade}
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
                        title="Ver Perfil"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewProfile(patient);
                        }}
                    >
                        <Eye className="size-3.5 text-blue-600 hover:text-blue-700 transition-colors" />
                    </Button>
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
            columns={columns}
            searchPlaceholder="Buscar por nome, CPF ou e-mail..."
            searchFilter={(patient, query) => {
                const term = query.toLowerCase();
                return (
                    patient.nome.toLowerCase().includes(term) ||
                    patient.cpf.includes(term) ||
                    patient.email.toLowerCase().includes(term)
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
