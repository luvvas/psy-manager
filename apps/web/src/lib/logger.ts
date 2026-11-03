import * as Sentry from "@sentry/react";

export const logger = {
    error(context: string, error?: unknown) {
        if (import.meta.env.DEV) {
            console.error(`[${context}]`, error);
            return;
        }
        Sentry.captureException(error ?? new Error(context), { tags: { context } });
    },
};
