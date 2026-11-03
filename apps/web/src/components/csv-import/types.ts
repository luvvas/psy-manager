/** Conteúdo lido do CSV: a primeira linha vira `headers`, o resto `rows`. */
export interface CsvData {
    headers: string[];
    rows: string[][];
}

/** Campo de destino do import (ex.: "nome" do paciente). */
export interface CsvField<Id extends string = string> {
    id: Id;
    label: string;
    /** O botão de importar só libera quando todos os obrigatórios estão mapeados. */
    required?: boolean;
}

/** Índice da coluna do CSV (como string) → campo de destino, ou "skip". */
export type CsvMappings<Id extends string> = Record<string, Id | "skip">;
