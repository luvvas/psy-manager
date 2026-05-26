import * as Sentry from "@sentry/hono/node";

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: !!process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
        const headers = event.request?.headers;
        if (headers) {
            for (const key of Object.keys(headers)) {
                if (/cookie|authorization|x-auth-token|password|token|auth/i.test(key)) {
                    delete headers[key];
                }
            }
        }
        return event;
    },
});
