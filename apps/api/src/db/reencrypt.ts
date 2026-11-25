import "../load-env";
import { checkEncryptionKeys } from "../lib/encryption";
import { ReencryptError, reencryptAll, type ReencryptReport, type TableCount } from "../lib/reencrypt";

const USAGE = [
    "Uso:",
    "  bun run db:reencrypt --dry-run   confere e conta, sem gravar nada",
    "  bun run db:reencrypt             regrava com a primeira chave de ENCRYPTION_KEYS",
].join("\n");

function formatCounts(title: string, tables: TableCount[]) {
    const lines = [title];
    for (const table of tables) {
        lines.push(`  ${table.table}: ${table.rows} linha(s)`);
        for (const c of table.columns) {
            if (c.encrypted === 0 && c.plaintext === 0) continue;
            const byKey = c.byKey.map((n, i) => `chave ${i + 1}${i === 0 ? " (atual)" : ""}: ${n}`).join(", ");
            const parts = [`${c.encrypted} cifrado(s)`, byKey];
            if (c.plaintext > 0) parts.push(`${c.plaintext} em texto puro (não mexido)`);
            if (c.failures > 0) parts.push(`${c.failures} sem chave que decripte`);
            lines.push(`    ${c.column}: ${parts.join(" | ")}`);
        }
    }
    return lines.join("\n");
}

function print(report: ReencryptReport) {
    console.log(`Chaves configuradas: ${report.keyCount}. Modo: ${report.dryRun ? "--dry-run (nada é gravado)" : "regravação"}.`);
    report.fingerprints.forEach((fp, i) => {
        console.log(`  chave ${i + 1}${i === 0 ? " (atual, usada para gravar)" : ""}: sha256 ${fp}…`);
    });
    console.log("  Confira que a chave 1 é a nova (procedimento em ai/context/deployment.md).");
    if (report.before.length > 0) console.log(formatCounts("Antes:", report.before));
    if (report.after) console.log(formatCounts("Depois:", report.after));
    if (report.failures.length > 0) {
        console.error("Valores que nenhuma chave decripta (tabela.coluna id):");
        for (const f of report.failures.slice(0, 50)) console.error(`  ${f.table}.${f.column} ${f.id}`);
        if (report.failures.length > 50) console.error(`  ... e mais ${report.failures.length - 50}.`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.some((a) => a !== "--dry-run")) {
        console.error(USAGE);
        process.exitCode = 1;
        return;
    }

    const keyErrors = checkEncryptionKeys(process.env);
    if (keyErrors.length > 0) {
        for (const e of keyErrors) console.error(e);
        process.exitCode = 1;
        return;
    }

    try {
        const report = await reencryptAll({ dryRun: args.includes("--dry-run") });
        print(report);
        if (report.dryRun) {
            const pending = report.before.flatMap((t) => t.columns).reduce((n, c) => n + c.encrypted - c.byKey[0], 0);
            console.log(`Valores a regravar: ${pending}. Nada foi alterado.`);
        } else {
            console.log(`Regravados ${report.rewrittenValues} valor(es) em ${report.rewrittenRows} linha(s). Conferência ok.`);
        }
    } catch (err) {
        if (err instanceof ReencryptError) {
            print(err.report);
            console.error(err.message);
        } else {
            console.error(err instanceof Error ? err.message : err);
        }
        process.exitCode = 1;
    }
}

main()
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((err) => {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
    });
