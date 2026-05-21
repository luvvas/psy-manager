import * as Sentry from "@sentry/hono/node";

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: process.env.NODE_ENV === "production",
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
});
