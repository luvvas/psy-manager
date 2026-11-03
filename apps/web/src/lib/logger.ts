import * as Sentry from "@sentry/react";

export const logger = {
    /**
     * Erro tratado (toast já mostrado, por exemplo) que ainda assim precisa ser
     * investigado. Em dev vai para o console; em produção, para o Sentry.
     */
    error(context: string, error?: unknown) {
        if (import.meta.env.DEV) {
            console.error(`[${context}]`, error);
            return;
        }
        Sentry.captureException(error ?? new Error(context), { tags: { context } });
    },
};
