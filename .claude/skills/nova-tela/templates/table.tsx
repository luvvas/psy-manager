import { FileBadge, Pencil, Phone, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import type { RouterOutputs } from "@/lib/trpc";

export type HealthPlan = RouterOutputs["healthPlan"]["list"][number];

interface HealthPlansTableProps {
    healthPlans: HealthPlan[];
    isLoading?: boolean;
    onEdit: (row: HealthPlan) => void;
    onDelete: (id: string, nome: string) => void;
}

export function HealthPlansTable({ healthPlans, isLoading, onEdit, onDelete }: HealthPlansTableProps) {
    const columns: DataTableColumn<HealthPlan>[] = [
        {
            header: "Nome",
            className: "w-[40%]",
            render: (row) => <span className="font-medium text-foreground">{row.nome}</span>,
        },
        {
            header: "Registro ANS",
            className: "w-[24%]",
            render: (row) => (
                <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <FileBadge className="size-3.5" />
                    {row.registroAns || "—"}
                </span>
            ),
        },
        {
            header: "Telefone",
            className: "w-[24%]",
            render: (row) => (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3.5" />
                    {row.telefone || "—"}
                </span>
            ),
        },
        {
            header: "",
            className: "w-[12%] text-right",
            render: (row) => (
                <div className="flex justify-end items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Editar"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(row);
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
                            onDelete(row.id, row.nome);
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
            data={healthPlans}
            isLoading={isLoading}
            columns={columns}
            searchPlaceholder="Buscar por nome ou registro ANS..."
            searchFilter={(row, query) => {
                const term = query.toLowerCase();
                return row.nome.toLowerCase().includes(term) || (row.registroAns ?? "").includes(term);
            }}
            emptyState={{
                title: "Nenhum convênio encontrado",
                description: "Cadastre um convênio para começar.",
                icon: ShieldCheck,
            }}
        />
    );
}
