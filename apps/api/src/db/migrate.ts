/**
 * Runs pending Drizzle migrations using drizzle-orm's migrator.
 *
 * Why not `drizzle-kit migrate`: drizzle-kit is a devDependency, and requiring it
 * at runtime forces the production image to ship the whole build toolchain
 * (drizzle-kit, tsx, typescript and the esbuild binaries they pull in). This
 * script needs only `drizzle-orm` and `postgres`, both runtime dependencies, so
 * the image can be installed with `--production`.
 *
 * State is shared with drizzle-kit: both track applied migrations in
 * `drizzle.__drizzle_migrations`, so switching between them is safe.
 */
import "../load-env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import { fileURLToPath } from "url";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error("[migrate] DATABASE_URL é obrigatória.");
    process.exit(1);
}

// A dedicated single connection — the migrator must not share the app pool.
// onnotice: silencia NOTICEs de "IF NOT EXISTS" para o log de deploy ficar legível.
const client = postgres(connectionString, { max: 1, onnotice: () => {} });

// Resolved from this file, not from cwd, so it works regardless of where it runs.
const migrationsFolder = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../drizzle"
);

try {
    console.log(`[migrate] Aplicando migrations de ${migrationsFolder}`);
    await migrate(drizzle(client), { migrationsFolder });
    console.log("[migrate] Migrations em dia.");
} catch (err) {
    console.error("[migrate] Falha ao aplicar migrations:", err);
    process.exit(1);
} finally {
    await client.end();
}
