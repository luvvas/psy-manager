import { useDeferredValue, useState } from "react";
import { Search, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

const LOADING_ROWS = 5;

interface DataTableProps<T> {
    data: T[];
    /**
     * Primeira carga da query (`isPending`). Mostra linhas de esqueleto em vez do
     * estado vazio — sem isso a tela dizia "Nenhum paciente cadastrado" enquanto carregava.
     * Não passe `isFetching`: refetch em segundo plano não deve esconder a tabela.
     */
    isLoading?: boolean;
    columns: DataTableColumn<T>[];
    searchPlaceholder?: string;
    searchFilter: (item: T, query: string) => boolean;
    /** Chave da linha; padrão: `item.id`. */
    getRowKey?: (item: T) => string | number;
    emptyState?: {
        title: string;
        description: string;
        icon?: LucideIcon;
    };
}

export function DataTable<T extends { id: string | number }>({
    data,
    isLoading = false,
    columns,
    searchPlaceholder = "Buscar...",
    searchFilter,
    getRowKey,
    emptyState,
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState("");
    // A digitação atualiza o input na hora; o filtro (que pode passar por centenas de
    // linhas e renderizar todas as células) acompanha sem travar o teclado.
    const deferredQuery = useDeferredValue(searchQuery);
    const isStale = searchQuery !== deferredQuery;

    const filteredData = data.filter((item) => searchFilter(item, deferredQuery));

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

            <div className={`rounded-lg border bg-card overflow-hidden transition-opacity ${isStale ? "opacity-70" : ""}`}>
                {!isLoading && filteredData.length === 0 ? (
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
                                {columns.map((col, colIndex) => (
                                    <TableHead
                                        key={colIndex}
                                        className={col.className}
                                        style={{
                                            backgroundColor: "var(--table-header-bg, var(--sidebar))",
                                            color: "var(--table-header-fg, var(--sidebar-foreground))",
                                        }}
                                    >
                                        {col.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading
                                ? Array.from({ length: LOADING_ROWS }, (_, rowIndex) => (
                                      <TableRow key={rowIndex}>
                                          {columns.map((col, colIndex) => (
                                              <TableCell key={colIndex} className={col.className}>
                                                  <Skeleton className="h-4 w-3/4" />
                                              </TableCell>
                                          ))}
                                      </TableRow>
                                  ))
                                : filteredData.map((item) => (
                                      // Chave estável: com índice, filtrar pela busca fazia o React
                                      // reaproveitar a linha errada.
                                      <TableRow key={getRowKey ? getRowKey(item) : item.id}>
                                          {columns.map((col, colIndex) => (
                                              <TableCell key={colIndex} className={col.className}>
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
