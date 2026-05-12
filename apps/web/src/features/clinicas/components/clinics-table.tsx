import { Building2, Mail, Phone, MapPin, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useSession } from "@/lib/auth-client";

export interface DBClinic {
    id: string;
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    psychologists: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
    }[];
}

interface ClinicsTableProps {
    clinics: DBClinic[];
    onEdit: (clinic: DBClinic) => void;
    onDelete: (id: string, name: string) => void;
}

export function ClinicsTable({ clinics, onEdit, onDelete }: ClinicsTableProps) {
    const { data: session } = useSession();

    const columns: DataTableColumn<DBClinic>[] = [
        {
            header: "Clínica",
            className: "w-[25%]",
            render: (clinic) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-foreground text-sm block">
                        {clinic.name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        {clinic.cnpj}
                    </span>
                </div>
            ),
        },
        {
            header: "Contato",
            className: "w-[25%]",
            render: (clinic) => (
                <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs md:text-sm">
                        <Mail className="size-3.5 shrink-0" />
                        {clinic.email}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Phone className="size-3.5 shrink-0" />
                        {clinic.phone}
                    </span>
                </div>
            ),
        },
        {
            header: "Localização",
            className: "w-[25%]",
            render: (clinic) => (
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0" />
                        {clinic.address}
                    </span>
                    <span className="font-medium text-foreground ml-5">{clinic.city}</span>
                </div>
            ),
        },
        {
            header: "Profissionais",
            className: "w-[17%]",
            render: (clinic) => (
                <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit">
                        <Users className="size-3.5 shrink-0" />
                        {clinic.psychologists.length} profissionais
                    </span>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                        {clinic.psychologists.map((p) => p.name).join(", ")}
                    </p>
                </div>
            ),
        },
        {
            header: "",
            className: "w-[8%] text-right",
            render: (clinic) => {
                const isOwner = clinic.createdById === session?.user?.id;
                if (!isOwner) return null;
                return (
                    <div className="flex justify-end items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(clinic);
                            }}
                        >
                            <Pencil className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(clinic.id, clinic.name);
                            }}
                        >
                            <Trash2 className="size-3.5 transition-colors" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <DataTable
            data={clinics}
            columns={columns}
            searchPlaceholder="Buscar por nome, CNPJ ou cidade..."
            searchFilter={(clinic, query) => {
                const term = query.toLowerCase();
                return (
                    clinic.name.toLowerCase().includes(term) ||
                    clinic.cnpj.includes(term) ||
                    clinic.city.toLowerCase().includes(term)
                );
            }}
            emptyState={{
                title: "Nenhuma clínica encontrada",
                description: "Você ainda não possui clínicas cadastradas. Cadastre uma nova clínica para começar.",
                icon: Building2,
            }}
        />
    );
}
