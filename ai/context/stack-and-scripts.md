# Stack And Scripts

## Repository Shape

This is a Bun workspace monorepo.

```text
apps/
  api/
  web/
docker/
scripts/
ai/
```

## Runtime Stack

- Package manager/runtime: Bun.
- Language: TypeScript.
- API: Hono, `@hono/node-server`, tRPC v11, SuperJSON.
- Auth: Better Auth with Drizzle adapter.
- Database: PostgreSQL via Drizzle ORM and `postgres`.
- Web: React 19, Vite, React Router, TanStack React Query, tRPC React Query.
- UI: Tailwind CSS v4, shadcn/radix-nova config, Radix UI, lucide-react, Sonner.
- Charts: Recharts.
- Forms: react-hook-form and Zod where already used.
- CSV import: PapaParse.
- Storage: local dev storage or presigned URLs against an S3-compatible bucket
  (Cloudflare R2 in production).
- Deployment: a single VPS (Hostinger, São Paulo) running Docker Compose — API,
  Postgres and an nginx `web` container — behind Cloudflare Tunnel. Images live
  in GHCR. See `ai/context/deployment.md`.

## Root Scripts

- `bun run dev`: run web and API together.
- `bun run dev:web`: run only the Vite frontend.
- `bun run dev:api`: run only the API with `tsx watch`.
- `bun run build`: build web and API.
- `bun run build:web`: build frontend.
- `bun run build:api`: build backend.
- `bun run db:generate`: generate Drizzle migrations through the API package.
- `bun run db:migrate`: run Drizzle migrations through the API package.
- `bun run db:push`: push schema changes through the API package.
- `bun run db:studio`: open Drizzle Studio.
- `bun run docker:db`: start only the local Postgres container.
- `bun run docker:up`: start local Docker Compose services.
- `bun run docker:down`: stop local Docker Compose services.

## Package Scripts

API package:

- `bun run --filter @psy-manager/api dev`
- `bun run --filter @psy-manager/api build`
- `bun run --filter @psy-manager/api start`
- `bun run --filter @psy-manager/api db:generate`
- `bun run --filter @psy-manager/api db:migrate`
- `bun run --filter @psy-manager/api db:push`
- `bun run --filter @psy-manager/api db:studio`

Web package:

- `bun run --filter @psy-manager/web dev`
- `bun run --filter @psy-manager/web build`
- `bun run --filter @psy-manager/web lint`
- `bun run --filter @psy-manager/web preview`

## Local Ports

- Web dev server: `http://localhost:5173`
- API: `http://localhost:3001`
- tRPC endpoint: `http://localhost:3001/trpc`
- Auth endpoint: `http://localhost:3001/api/auth`
- Local Postgres: `localhost:5432`

## Public Config Shape

Use `.env.example` as the safe source of environment-variable names. Do not paste
values from `.env`.

Important variables:

- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `API_PORT`
- `BETTER_AUTH_URL`
- `STORAGE_DRIVER`
- `LOCAL_STORAGE_DIR`
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN`
- `VITE_API_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## Tests

Test runner: Bun's built-in test runner (`bun test`).

- Unit: `bun run test:api` (`bun test ./tests` in the API package). Coverage:
  `bun test ./tests --coverage` from `apps/api`.
- Integration: `bun run test:integration:db` once (disposable Postgres from
  `docker-compose.test.yml`, port 5433, tmpfs, user/password `psy_test`), then
  `bun run test:integration`. Stop it with `bun run test:integration:db:down`.
  Override the database with `TEST_DATABASE_URL`; `INTEGRATION_VERBOSE=1` keeps
  `console.log`.
- CI: the `quality-gate` job in `.github/workflows/deploy.yml` runs both, with
  Postgres as a service.

The two suites live in separate folders and run in separate `bun test`
processes on purpose: the unit suite uses `mock.module`, which is process-wide.

Test files live in `apps/api/tests/` with this structure:

```text
apps/api/tests/
  utils/
    router-test-utils.ts   ← shared mocks, callers, input builders, state
  routes/
    auth.test.ts           ← UNAUTHORIZED guards for all major procedures
    psychologist.test.ts
    patient.test.ts        ← includes cross-user isolation tests
    appointment.test.ts    ← includes cross-user isolation + Google OAuth tests
    clinic.test.ts
    financial.test.ts
    document.test.ts
    clinical-record.test.ts
    video-session.test.ts
  cqrs/
    patient.aggregate.test.ts      ← domain event + state machine tests
    appointment.aggregate.test.ts  ← domain event + state machine tests
```

All route tests use module-level mocking (no real DB). The `cqrs/` tests test
aggregate classes directly with no mocks — pure domain logic.

Route tests assert:
- Happy-path responses and return shapes.
- Error codes (NOT_FOUND, FORBIDDEN, UNAUTHORIZED, BAD_REQUEST).
- That the correct `psychologistId` (always `ctx.session.user.id`) is passed
  into commands and queries — the primary cross-user isolation guarantee.

Aggregate tests assert:
- Each command raises the expected event type and version.
- `loadFromHistory` reconstructs identical state from persisted events.
- Business rule guards throw on invalid state transitions (double-create,
  update-after-delete, double-delete, invalid fields).

### E2E suite (`apps/e2e/`)

Playwright (Chromium only) against the built SPA (`vite preview` on 5174) and the
real API (`apps/e2e/scripts/api-server.ts` on 3101), which recreates the
`psy_manager_e2e` database on the test Postgres (5433), migrates it and imports
`apps/api/src/index.ts` with test env. Run `bun run test:integration:db` once,
`bun run --filter @psy-manager/e2e install:browsers` once, then
`bun run test:e2e`. Report: `bun run --filter @psy-manager/e2e report`.

- The Vite proxy (`apps/web/vite.config.ts`) mirrors nginx: `/trpc`, `/api` and
  `/ws`, target from `API_PROXY_TARGET` (default `http://localhost:3001`).
- `tests/fixtures.ts`: every test context gets a random `cf-connecting-ip`, so the
  auth rate limits never trip and need no bypass in the API. The `psychologist`
  fixture signs up through `context.request` (shares the cookie jar);
  `newSession(browser, name)` gives a second, independent psychologist.
  `trpc`/`trpcQuery` seed data through the API; the journey under test goes
  through the UI. `window.confirm` dialogs are auto-accepted.
- Selectors: `getByLabel`/`getByRole` and the existing `id`s; no `data-testid`.
- Teleconsulta runs real WebRTC between two contexts with fake media devices.
- `playwright.config.ts` pins `TZ=America/Sao_Paulo` for the test process (the
  browser uses the same `timezoneId` and the API sets its own `TZ`). Tests build
  dates with `new Date()`; on a UTC runner they would land on another day or time.

### Integration suite (`apps/api/tests-integration/`)

Real Postgres (migrations via drizzle `migrate`, not `db:push`, because the
`event_store (aggregate_id, version)` unique index lives only in
`drizzle/0009`), real Better Auth, real event store, column encryption, FK
cascades and the local storage driver.

```text
apps/api/tests-integration/
  setup/preload.ts   ← test env (fixed test keys, local storage in a temp dir,
                       no S3/TURN/SMTP/Sentry), drops and re-migrates the schema
  setup/helpers.ts   ← createApp() instance, signUp() via /api/auth, tRPC callers
                       from the session cookie, factories, fetch stub, PDF upload
  auth.test.ts                 ← sign-up/in/out, UNAUTHORIZED, rate limits (#39)
  isolation-account.test.ts    ← psychologist A vs B on every module, exportData,
                                 password reset e-mail, deleteAccount
  patient.test.ts              ← event store + projection, encryption at rest,
                                 concurrency, cascades
  appointment.test.ts          ← conflicts, work schedule, São Paulo day,
                                 freeSlots, rooms, shared-clinic visibility
  google-calendar.test.ts      ← OAuth state, sync/dedupe, token refresh
  clinic.test.ts, financial.test.ts, documents-storage.test.ts,
  clinical-record.test.ts, video-session.test.ts
```

Conventions: each test signs up its own users (unique e-mail and IP), so tests
don't depend on order and nothing is truncated between files. Patient and
appointment writes go through procedures; raw SQL is used only to assert what
is stored (ciphertext, versions) or to set up states with no route (an expired
video session, an expired Google token). Tests named "lacuna conhecida" pin
current behavior that is questionable; changing that rule is a separate task.

