/// <reference types="vite/client" />

// Variáveis VITE_* são públicas: vão em texto puro para o bundle. Nunca segredo aqui.
interface ImportMetaEnv {
    /** Vazia em produção: SPA e API na mesma origem (cookie SameSite=Lax). */
    readonly VITE_API_URL?: string;
    readonly VITE_WS_URL?: string;
    readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
