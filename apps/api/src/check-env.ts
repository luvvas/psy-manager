import { checkServerEnv } from "./lib/env-check";

// Imported right after load-env in index.ts, before any server module.
const errors = checkServerEnv(process.env);
if (errors.length > 0) {
    console.error("[env] A API não vai iniciar. Corrija as variáveis de ambiente:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
}
