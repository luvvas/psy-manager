/// <reference types="bun" />

import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const TEST_DATABASE_URL =
    process.env.TEST_DATABASE_URL ?? "postgres://psy_test:psy_test@127.0.0.1:5433/psy_manager_test";

Object.assign(process.env, {
    TZ: "America/Sao_Paulo",
    DATABASE_URL: TEST_DATABASE_URL,
    ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    BETTER_AUTH_SECRET: "integration-tests-only-secret-0123456789abcdef",
    BETTER_AUTH_URL: "http://localhost:3001",
    PUBLIC_URL: "http://localhost:5173",
    ALLOWED_ORIGINS: "http://localhost:5173",
    REQUEST_LOG: "off",
    STORAGE_DRIVER: "local",
    S3_BUCKET: "",
    LOCAL_STORAGE_DIR: mkdtempSync(path.join(tmpdir(), "psy-int-storage-")),
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:5173/google-callback",
    CF_TURN_KEY_ID: "",
    CF_TURN_API_TOKEN: "",
    SMTP_HOST: "",
    SENTRY_DSN: "",
    DISCORD_FEEDBACK_WEBHOOK_URL: "",
});

if (process.env.INTEGRATION_VERBOSE !== "1") {
    console.log = () => {};
    console.warn = () => {};
}

const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
try {
    await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
    await migrate(drizzle(client), {
        migrationsFolder: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle"),
    });
} catch (err) {
    process.stderr.write(
        `\n[integration] Não foi possível preparar o banco de teste em ${TEST_DATABASE_URL}.\n` +
            "Suba-o com: bun run test:integration:db\n\n"
    );
    throw err;
} finally {
    await client.end();
}
