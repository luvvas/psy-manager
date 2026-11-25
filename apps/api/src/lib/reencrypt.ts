import { sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { decryptWithKeyIndex, encrypt, isCiphertext, keyFingerprints } from "./encryption";

type Column = { name: string; select: SQL; assign: (value: string) => SQL };
type Target = { table: string; columns: Column[] };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const text = (name: string): Column => ({
    name,
    select: sql`${sql.identifier(name)}`,
    assign: (value) => sql`${sql.identifier(name)} = ${value}`,
});

const eventEnvelope: Column = {
    name: "data.__enc",
    select: sql`data->>'__enc'`,
    assign: (value) => sql`data = jsonb_set(data, '{__enc}', to_jsonb(${value}::text))`,
};

export const REENCRYPT_TARGETS: Target[] = [
    {
        table: "patient",
        columns: [
            "nome",
            "email",
            "telefone",
            "data_nascimento",
            "cpf",
            "rg",
            "nome_social",
            "profissao",
            "endereco",
            "cep",
            "contato_emergencia",
            "resp_legal_nome",
            "resp_legal_cpf",
            "resp_legal_telefone",
            "resp_legal_email",
            "forma_pagamento",
            "forma_pagamento_detalhe",
            "responsavel_financeiro_detalhe",
        ].map(text),
    },
    { table: "appointment", columns: [text("notes")] },
    { table: "event_store", columns: [eventEnvelope] },
    { table: "user", columns: [text("cpf")] },
    { table: "document", columns: [text("title"), text("content")] },
    { table: "clinical_record", columns: [text("title"), text("text_content")] },
    { table: "financial_transaction", columns: [text("description")] },
    { table: "account", columns: [text("access_token"), text("refresh_token")] },
];

export type ColumnCount = {
    column: string;
    encrypted: number;
    plaintext: number;
    byKey: number[];
    failures: number;
};

export type TableCount = { table: string; rows: number; columns: ColumnCount[] };

export type Failure = { table: string; column: string; id: string };

export type ReencryptReport = {
    dryRun: boolean;
    keyCount: number;
    fingerprints: string[];
    before: TableCount[];
    after: TableCount[] | null;
    rewrittenValues: number;
    rewrittenRows: number;
    failures: Failure[];
};

export class ReencryptError extends Error {
    constructor(
        message: string,
        public readonly report: ReencryptReport
    ) {
        super(message);
    }
}

const BATCH_SIZE = 500;

type Row = { id: string } & Record<string, string | null>;

async function* rows(tx: Tx, target: Target): AsyncGenerator<Row> {
    const selects = sql.join(
        target.columns.map((c, i) => sql`${c.select} as ${sql.identifier(`c${i}`)}`),
        sql`, `
    );
    let cursor: string | null = null;
    for (;;) {
        const after: SQL = cursor === null ? sql`true` : sql`id > ${cursor}`;
        const batch = (await tx.execute(
            sql`select id, ${selects} from ${sql.identifier(target.table)} where ${after} order by id limit ${BATCH_SIZE}`
        )) as unknown as Row[];
        for (const row of batch) yield row;
        if (batch.length < BATCH_SIZE) return;
        cursor = batch[batch.length - 1].id;
    }
}

type Visit = (target: Target, row: Row, changes: { column: Column; ciphertext: string }[]) => Promise<void>;

async function scan(tx: Tx, keyCount: number, failures: Failure[], visit?: Visit): Promise<TableCount[]> {
    const tables: TableCount[] = [];
    for (const target of REENCRYPT_TARGETS) {
        const columns: ColumnCount[] = target.columns.map((c) => ({
            column: c.name,
            encrypted: 0,
            plaintext: 0,
            byKey: Array<number>(keyCount).fill(0),
            failures: 0,
        }));
        let rowCount = 0;
        for await (const row of rows(tx, target)) {
            rowCount++;
            const changes: { column: Column; ciphertext: string }[] = [];
            target.columns.forEach((column, i) => {
                const value = row[`c${i}`];
                if (value == null || value === "") return;
                const count = columns[i];
                if (!isCiphertext(value)) {
                    count.plaintext++;
                    return;
                }
                count.encrypted++;
                let decrypted: { plaintext: string; keyIndex: number };
                try {
                    decrypted = decryptWithKeyIndex(value);
                } catch {
                    count.failures++;
                    failures.push({ table: target.table, column: column.name, id: row.id });
                    return;
                }
                count.byKey[decrypted.keyIndex]++;
                if (decrypted.keyIndex === 0 || !visit) return;
                const ciphertext = encrypt(decrypted.plaintext);
                const check = decryptWithKeyIndex(ciphertext);
                if (check.keyIndex !== 0 || check.plaintext !== decrypted.plaintext) {
                    throw new Error(`Recriptografia não confere em ${target.table}.${column.name} (id ${row.id}).`);
                }
                changes.push({ column, ciphertext });
            });
            if (visit && changes.length > 0) await visit(target, row, changes);
        }
        tables.push({ table: target.table, rows: rowCount, columns });
    }
    return tables;
}

function compare(before: TableCount[], after: TableCount[]): string[] {
    const problems: string[] = [];
    before.forEach((b, t) => {
        const a = after[t];
        if (a.rows !== b.rows) problems.push(`${b.table}: ${b.rows} linhas antes, ${a.rows} depois.`);
        b.columns.forEach((bc, c) => {
            const ac = a.columns[c];
            const where = `${b.table}.${bc.column}`;
            if (ac.encrypted !== bc.encrypted) {
                problems.push(`${where}: ${bc.encrypted} valores cifrados antes, ${ac.encrypted} depois.`);
            }
            if (ac.plaintext !== bc.plaintext) {
                problems.push(`${where}: ${bc.plaintext} valores em texto puro antes, ${ac.plaintext} depois.`);
            }
            if (ac.byKey[0] !== ac.encrypted) {
                problems.push(`${where}: ${ac.encrypted - ac.byKey[0]} valores ainda não estão na chave atual.`);
            }
        });
    });
    return problems;
}

export async function reencryptAll(options: { dryRun: boolean }): Promise<ReencryptReport> {
    const fingerprints = keyFingerprints();
    const keyCount = fingerprints.length;
    const report: ReencryptReport = {
        dryRun: options.dryRun,
        keyCount,
        fingerprints,
        before: [],
        after: null,
        rewrittenValues: 0,
        rewrittenRows: 0,
        failures: [],
    };

    const run = async (tx: Tx) => {
        await tx.execute(sql`set local lock_timeout = '10s'`);
        if (!options.dryRun) {
            const tables = sql.join(
                REENCRYPT_TARGETS.map((t) => sql.identifier(t.table)),
                sql`, `
            );
            await tx.execute(sql`lock table ${tables} in share row exclusive mode`);
        }

        report.before = await scan(tx, keyCount, report.failures);
        if (report.failures.length > 0) {
            throw new ReencryptError(
                `${report.failures.length} valor(es) cifrado(s) não decriptam com nenhuma chave configurada. Nada foi alterado.`,
                report
            );
        }
        if (options.dryRun) return;

        await scan(tx, keyCount, [], async (target, row, changes) => {
            const assignments = sql.join(
                changes.map((c) => c.column.assign(c.ciphertext)),
                sql`, `
            );
            const updated = (await tx.execute(
                sql`update ${sql.identifier(target.table)} set ${assignments} where id = ${row.id} returning id`
            )) as unknown as Row[];
            if (updated.length !== 1) {
                throw new Error(`Esperava atualizar 1 linha em ${target.table} (id ${row.id}), atualizou ${updated.length}.`);
            }
            report.rewrittenRows++;
            report.rewrittenValues += changes.length;
        });

        const afterFailures: Failure[] = [];
        report.after = await scan(tx, keyCount, afterFailures);
        const problems = compare(report.before, report.after);
        if (afterFailures.length > 0) problems.push(`${afterFailures.length} valor(es) não decriptam depois da regravação.`);
        if (problems.length > 0) {
            throw new ReencryptError(`Conferência depois da regravação falhou; nada foi gravado. ${problems.join(" ")}`, report);
        }
    };

    try {
        if (options.dryRun) {
            await db.transaction(run, { isolationLevel: "repeatable read", accessMode: "read only" });
        } else {
            await db.transaction(run);
        }
    } catch (err) {
        if (err instanceof ReencryptError) throw err;
        throw new ReencryptError(
            `Falha durante a recriptografia; a transação foi desfeita. ${err instanceof Error ? err.message : String(err)}`,
            report
        );
    }
    return report;
}
