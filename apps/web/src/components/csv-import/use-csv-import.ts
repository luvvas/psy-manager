import { useState } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/utils/format";
import type { CsvData, CsvField, CsvMappings } from "./types";

async function readCsv(file: File): Promise<string[][]> {
    // PapaParse só é baixado quando alguém importa um arquivo (bundle-conditional).
    const { default: Papa } = await import("papaparse");
    return new Promise((resolve, reject) => {
        Papa.parse<string[]>(file, {
            complete: (result) => resolve(result.data),
            error: (error) => reject(error),
            skipEmptyLines: true,
        });
    });
}

/**
 * Estado do import de CSV (arquivo lido + mapeamento coluna → campo), compartilhado por
 * pacientes e financeiro. O mapeamento começa com todas as colunas em "skip" no mesmo
 * handler que lê o arquivo — antes era reiniciado num efeito, com um render a mais.
 */
export function useCsvImport<Id extends string>(fields: readonly CsvField<Id>[]) {
    const [csvData, setCsvData] = useState<CsvData | null>(null);
    const [mappings, setMappings] = useState<CsvMappings<Id>>({});

    /** Lê o arquivo; devolve true se carregou (a tela troca para a aba de importação). */
    const loadFile = async (file: File): Promise<boolean> => {
        try {
            const data = await readCsv(file);
            if (data.length === 0) {
                toast.error("Arquivo está vazio.");
                return false;
            }
            const headers = data[0].map((h) => String(h).trim());
            const rows = data.slice(1).filter((row) => row.length > 1 || row[0] !== "");
            setCsvData({ headers, rows });
            setMappings(Object.fromEntries(headers.map((_, i) => [String(i), "skip"])) as CsvMappings<Id>);
            toast.success(`Arquivo "${file.name}" carregado!`);
            return true;
        } catch (err) {
            logger.error("Erro ao ler CSV", err);
            toast.error(`Erro ao ler CSV: ${getErrorMessage(err)}`);
            return false;
        }
    };

    const setMapping = (columnIndex: string, value: Id | "skip") =>
        setMappings((prev) => ({ ...prev, [columnIndex]: value }));

    const reset = () => {
        setCsvData(null);
        setMappings({});
    };

    const required = fields.filter((f) => f.required);
    const mapped = new Set(Object.values(mappings));
    const mappedRequiredCount = required.filter((f) => mapped.has(f.id)).length;

    return {
        csvData,
        mappings,
        loadFile,
        setMapping,
        reset,
        requiredCount: required.length,
        mappedRequiredCount,
        isMappingComplete: csvData !== null && mappedRequiredCount === required.length,
    };
}
