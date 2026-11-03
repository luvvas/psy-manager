---
title: VITE_ Variables Are Public and Build-Time
impact: HIGH
impactDescription: prevents leaking secrets into the public bundle
tags: vite, env, security, import-meta-env
---

## VITE_ Variables Are Public and Build-Time

Only variables prefixed with `VITE_` reach client code, through `import.meta.env`, and they are **inlined as plain text** into the JS at build time. Anything in a `VITE_*` variable is public. Changing one requires a rebuild — editing the server's `.env` does nothing to the SPA.

**Incorrect:**

```ts
// a secret in the public bundle
const webhook = import.meta.env.VITE_DISCORD_WEBHOOK_URL
fetch(webhook, { method: "POST", body })

// process.env does not exist in browser code
const api = process.env.API_URL

// values are strings
if (import.meta.env.VITE_FEATURE_X) { /* "false" is truthy */ }
```

**Correct:**

```ts
// the secret stays in the API; the client calls a procedure
trpc.feedback.submit.mutate(values)

const api = import.meta.env.VITE_API_URL ?? ""
if (import.meta.env.VITE_FEATURE_X === "true") { ... }
```

**Typing a new variable** — create `apps/web/src/vite-env.d.ts` (it must contain no `import`):

```ts
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_WS_URL?: string
  readonly VITE_SENTRY_DSN?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**In this project:** `VITE_API_URL` and `VITE_WS_URL` are empty in production on purpose (SPA and API share one origin, which keeps the session cookie `SameSite=Lax`). `VITE_SENTRY_DSN` is public by design. A new variable also goes into `.env.example` and, for production, into the web build step of `.github/workflows/deploy.yml`. In `vite.config.ts` (Node), `process.env` is correct.

Reference: [Vite — Env Variables and Modes](https://vite.dev/guide/env-and-mode)
