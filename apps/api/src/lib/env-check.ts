// Startup guard for the secrets the API cannot run safely without (issue #40).
// A wrong ENCRYPTION_KEY used to surface only at the first cipher operation,
// and decryptField would then quietly hand back ciphertext; now the process
// refuses to start. Messages name the variable, never its value.

// Placeholders from .env.example and common defaults: fine on a laptop,
// never in production.
const KNOWN_DEFAULTS = new Set([
    "postgres",
    "password",
    "changeme",
    "secret",
    "your-google-client-id.apps.googleusercontent.com",
    "your-google-client-secret",
]);

type Env = Record<string, string | undefined>;

function databasePassword(databaseUrl: string) {
    try {
        return decodeURIComponent(new URL(databaseUrl).password);
    } catch {
        return undefined;
    }
}

export function checkServerEnv(env: Env): string[] {
    const errors: string[] = [];

    const databaseUrl = env.DATABASE_URL;
    if (!databaseUrl) {
        errors.push("DATABASE_URL não definida.");
    } else {
        try {
            new URL(databaseUrl);
        } catch {
            errors.push("DATABASE_URL não é uma URL válida.");
        }
    }

    const encryptionKey = env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        errors.push("ENCRYPTION_KEY não definida.");
    } else if (Buffer.from(encryptionKey, "base64").length !== 32) {
        errors.push("ENCRYPTION_KEY deve ter 32 bytes depois de decodificada de base64.");
    }

    const authSecret = env.BETTER_AUTH_SECRET;
    if (!authSecret) {
        errors.push("BETTER_AUTH_SECRET não definida.");
    } else if (authSecret.length < 32) {
        errors.push("BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres.");
    }

    if (env.NODE_ENV === "production") {
        const secrets: Record<string, string | undefined> = {
            "senha da DATABASE_URL": databaseUrl ? databasePassword(databaseUrl) : undefined,
            BETTER_AUTH_SECRET: authSecret,
            GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
            SMTP_PASS: env.SMTP_PASS,
        };
        for (const [name, value] of Object.entries(secrets)) {
            if (value && KNOWN_DEFAULTS.has(value.trim().toLowerCase())) {
                errors.push(`${name} usa um valor padrão conhecido; troque antes de subir em produção.`);
            }
        }
    }

    return errors;
}
