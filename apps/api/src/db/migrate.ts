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

const client = postgres(connectionString, { max: 1, onnotice: () => {} });

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
