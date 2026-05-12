import { Pencil, Trash2, CheckCircle2, Clock, FileDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/data-table";

interface TransactionsTableProps {
    data: any[];
    type: "income" | "expense" | "all";
    onEdit: (transaction: any) => void;
    onDelete: (id: string) => void;
}

export function TransactionsTable({ data, type, onEdit, onDelete }: TransactionsTableProps) {
    const formatValue = (val: string | number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));
    };

    const columns: DataTableColumn<any>[] = [
        {
            header: "Data",
            className: "w-[12%]",
            render: (row) => new Date(row.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
        },
        {
            header: "Descrição",
            className: "w-[30%]",
            render: (row) => (
                <div>
                    <div className="font-medium">{row.description}</div>
                    {row.patientNome && <div className="text-xs text-muted-foreground">Paciente: {row.patientNome}</div>}
                </div>
            ),
        },
        {
            header: "Categoria",
            className: "w-[12%]",
            render: (row) => row.category ? <Badge variant="secondary" className="font-normal">{row.category}</Badge> : "-",
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
                    {row.type === "income" ? "+" : "-"} {formatValue(row.amount)}
                </span>
            ),
        },
        {
            header: "",
            className: "w-[10%] text-right",
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(row)}>
                        <Pencil className="size-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => onDelete(row.id)}>
                        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
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
