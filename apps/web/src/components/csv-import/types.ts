export interface CsvData {
    headers: string[];
    rows: string[][];
}

export interface CsvField<Id extends string = string> {
    id: Id;
    label: string;
    required?: boolean;
}

export type CsvMappings<Id extends string> = Record<string, Id | "skip">;
