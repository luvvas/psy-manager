import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const here = path.dirname(fileURLToPath(import.meta.url));
const adminUrl = process.env.E2E_ADMIN_DATABASE_URL ?? "postgres://psy_test:psy_test@127.0.0.1:5433/psy_manager_test";
const databaseName = process.env.E2E_DATABASE_NAME ?? "psy_manager_e2e";
const databaseUrl = Object.assign(new URL(adminUrl), { pathname: `/${databaseName}` }).toString();

const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
await admin.unsafe(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`);
await admin.unsafe(`CREATE DATABASE ${databaseName}`);
await admin.end();

const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
await migrate(drizzle(client), { migrationsFolder: path.resolve(here, "../../api/drizzle") });
await client.end();

const webUrl = process.env.E2E_WEB_URL ?? "http://localhost:5174";

Object.assign(process.env, {
    TZ: "America/Sao_Paulo",
    DATABASE_URL: databaseUrl,
    API_PORT: process.env.E2E_API_PORT ?? "3101",
    ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
    BETTER_AUTH_SECRET: "e2e-tests-only-secret-0123456789abcdefghij",
    BETTER_AUTH_URL: webUrl,
    PUBLIC_URL: webUrl,
    ALLOWED_ORIGINS: webUrl,
    REQUEST_LOG: "off",
    STORAGE_DRIVER: "local",
    S3_BUCKET: "",
    LOCAL_STORAGE_DIR: mkdtempSync(path.join(tmpdir(), "psy-e2e-storage-")),
    GOOGLE_CLIENT_ID: "e2e-client-id",
    GOOGLE_CLIENT_SECRET: "e2e-client-secret",
    GOOGLE_REDIRECT_URI: `${webUrl}/google-callback`,
    CF_TURN_KEY_ID: "",
    CF_TURN_API_TOKEN: "",
    SMTP_HOST: "",
    SENTRY_DSN: "",
    DISCORD_FEEDBACK_WEBHOOK_URL: "",
});

await import("../../api/src/index.ts");
