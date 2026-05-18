import { useState } from "react";
import { Search, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
    header: string;
    className?: string;
    render: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    data: T[];
    columns: DataTableColumn<T>[];
    searchPlaceholder?: string;
    searchFilter: (item: T, query: string) => boolean;
    getRowKey?: (item: T) => string | number;
    emptyState?: {
        title: string;
        description: string;
        icon?: LucideIcon;
    };
}

export function DataTable<T>({
    data,
    columns,
    searchPlaceholder = "Buscar...",
    searchFilter,
    getRowKey,
    emptyState,
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredData = data.filter((item) => searchFilter(item, searchQuery));

    const EmptyIcon = emptyState?.icon || Search;

    return (
        <div className="space-y-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="rounded-lg border bg-card overflow-hidden">
                {filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <EmptyIcon className="size-12 text-muted-foreground/50 mb-3" />
                        <h3 className="font-semibold text-lg">{emptyState?.title || "Nenhum resultado encontrado"}</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            {emptyState?.description || "Não encontramos nenhum item correspondente aos filtros atuais."}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.header} className={col.className}>
                                        {col.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((item, rowIndex) => (
                                <TableRow key={getRowKey ? getRowKey(item) : rowIndex}>
                                    {columns.map((col) => (
                                        <TableCell key={col.header} className={col.className}>
                                            {col.render(item)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
