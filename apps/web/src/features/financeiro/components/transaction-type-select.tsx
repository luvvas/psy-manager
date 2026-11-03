import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TransactionTypeFilter } from "../types";

const OPTIONS: { value: TransactionTypeFilter; label: string }[] = [
    { value: "all", label: "Tudo" },
    { value: "income", label: "Receitas" },
    { value: "expense", label: "Despesas" },
];

function isTransactionTypeFilter(value: string): value is TransactionTypeFilter {
    return OPTIONS.some((option) => option.value === value);
}

interface TransactionTypeSelectProps {
    value: TransactionTypeFilter;
    onChange: (value: TransactionTypeFilter) => void;
}

export function TransactionTypeSelect({ value, onChange }: TransactionTypeSelectProps) {
    return (
        <Select
            value={value}
            onValueChange={(next) => {
                if (isTransactionTypeFilter(next)) onChange(next);
            }}
        >
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filtrar por tipo">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
