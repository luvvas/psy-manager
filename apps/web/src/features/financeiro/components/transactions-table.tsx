import { Pencil, Trash2, CheckCircle2, Clock, FileDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { formatCurrency } from "@/utils/format";
import type { Transaction } from "../types";

interface TransactionsTableProps {
    data: Transaction[];
    type: "income" | "expense" | "all";
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string, description: string) => void;
}

const TX_DATE = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export function TransactionsTable({ data, type, onEdit, onDelete }: TransactionsTableProps) {
    const columns: DataTableColumn<Transaction>[] = [
        {
            header: "Data",
            className: "w-[12%]",
            render: (row) => TX_DATE.format(row.date),
        },
        {
            header: "Descrição",
            className: "w-[28%]",
            render: (row) => (
                <div>
                    <div className="font-medium text-foreground">{row.description}</div>
                    {row.patientNome && <div className="text-xs text-muted-foreground">Paciente: {row.patientNome}</div>}
                </div>
            ),
        },
        {
            header: "Categoria",
            className: "w-[12%]",
            render: (row) => row.category ? <Badge variant="secondary" className="font-normal">{row.category}</Badge> : "—",
        },
        {
            header: "Situação",
            className: "w-[18%]",
            render: (row) => {
                const isPaid = row.status === "paid";
                const isIncome = row.type === "income";
                const label = isPaid
                    ? (isIncome ? "Recebido" : "Pago")
                    : (isIncome ? "A Receber" : "A Pagar");

                return (
                    <Badge
                        variant={isPaid ? "default" : "outline"}
                        className={`gap-1.5 font-medium ${isPaid ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 shadow-none border-transparent" : "text-amber-700 border-amber-200 bg-amber-50"}`}
                    >
                        {isPaid ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {label}
                    </Badge>
                );
            }
        },
        {
            header: "Valor",
            className: "w-[18%]",
            render: (row) => (
                <span className={`font-semibold ${row.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                    {row.type === "income" ? "+" : "-"} {formatCurrency(row.amount)}
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
                            onDelete(row.id, row.description);
                        }}
                    >
                        <Trash2 className="size-3.5 transition-colors" />
                    </Button>
                </div>
            )
        }
    ];

    const placeholders = {
        income: {
            search: "Filtrar receitas...",
            title: "Sem receitas registradas",
            desc: "Adicione receitas ou expanda o filtro de período.",
            icon: DollarSign
        },
        expense: {
            search: "Filtrar despesas...",
            title: "Nenhuma despesa",
            desc: "Parabéns, nenhuma despesa registrada no período.",
            icon: FileDown
        },
        all: {
            search: "Filtrar movimentações...",
            title: "Nenhuma transação",
            desc: "Nenhuma movimentação financeira no período.",
            icon: DollarSign
        }
    }[type];

    return (
        <DataTable
            data={data}
            columns={columns}
            searchPlaceholder={placeholders.search}
            searchFilter={(row, term) => row.description.toLowerCase().includes(term.toLowerCase())}
            emptyState={{
                title: placeholders.title,
                description: placeholders.desc,
                icon: placeholders.icon
            }}
        />
    );
}
