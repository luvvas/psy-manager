# Architecture

## High-Level Shape

`psy-manager` is split into a typed API and a React web app.

- The API exposes tRPC procedures under `/trpc`.
- Better Auth handles auth endpoints under `/api/auth/*`.
- The web app talks to tRPC through `@trpc/react-query`.
- Vite proxies `/trpc` and `/api/auth` to the API during local development.
- PostgreSQL stores business data, auth data, projections, and event-store data.

## API Layers

Main files:

- Entry point: `apps/api/src/index.ts`
- Context: `apps/api/src/trpc/context.ts`
- tRPC helpers: `apps/api/src/trpc/index.ts`
- Root router: `apps/api/src/routes/router.ts`
- DB connection: `apps/api/src/db/index.ts`
- Schema: `apps/api/src/db/schema.ts`

Typical route pattern:

1. Define a tRPC procedure in `apps/api/src/routes/<module>.ts`.
2. Validate input with Zod.
3. Use `protectedProcedure` for authenticated operations.
4. Delegate business logic to a service or CQRS command/query.
5. Return plain objects that tRPC/SuperJSON can serialize.

## Authentication And Authorization

- Better Auth uses Drizzle and the auth tables in `schema.ts`.
- `createContext` loads the current Better Auth session from request headers.
- `protectedProcedure` rejects unauthenticated requests.
- Most business data should be scoped by `ctx.session.user.id`.
- Be careful with clinic actions and shared clinic data; do not expose or mutate
  records outside the logged-in user's allowed scope.

## CQRS And Event Sourcing

Patients and appointments use a CQRS/event-sourcing pattern.

- Shared primitives: `apps/api/src/lib/cqrs/index.ts`
- Event store table: `event_store`
- Patient command side: `apps/api/src/cqrs/patient/`
- Appointment command side: `apps/api/src/cqrs/appointment/`
- Query side reads projection tables directly.
- Projections subscribe to events on API startup in `apps/api/src/index.ts`.

For patient or appointment writes, prefer the existing command APIs instead of
writing directly to the projection tables. For reads, use the query side.

## Service-Based Modules

These modules use a thinner service approach:

- Psychologist profile: `psychologist.service.ts`
- Clinics: `clinic.service.ts`
- Financial transactions: `financial.service.ts`
- Documents: `document.service.ts`
- Clinical records: `clinical-record.service.ts`
- Storage: `storage.service.ts`
- Google Calendar: `google-calendar.service.ts`

## File Storage

PDF storage supports two drivers:

- `local`: uses temporary in-memory upload/read tokens and files under
  `LOCAL_STORAGE_DIR` or `.storage`.
- `s3`: uses AWS S3 presigned PUT and GET URLs.

Only PDFs up to 10 MB are accepted by the storage service.

Upload flow:

1. Web calls `document.prepareUpload` or `clinicalRecord.prepareUpload`.
2. API returns `{ uploadUrl, method, headers, storageKey }`.
3. Web uploads the file with `uploadFileToTarget`.
4. Web creates or updates metadata with the returned `storageKey`.

## Web Architecture

Main files:

- Entry point: `apps/web/src/main.tsx`
- Router: `apps/web/src/router.tsx`
- tRPC client: `apps/web/src/lib/trpc.ts`
- Auth client: `apps/web/src/lib/auth-client.ts`
- Layout: `apps/web/src/components/layout/`
- Feature modules: `apps/web/src/features/`
- UI primitives: `apps/web/src/components/ui/`

The app uses:

- `RouterProvider` for navigation.
- `QueryClientProvider` and `trpc.Provider` for server state.
- `TooltipProvider` and `Toaster` globally.
- `AuthGuard` for protected routes.
- `PublicOnlyGuard` for `/login`.

## Current Route Map

- `/login`: auth page.
- `/`: redirects to `/agendamento`.
- `/agendamento`: calendar and Google Calendar sync.
- `/google-callback`: Google OAuth callback.
- `/pacientes`: patient list and CRUD.
- `/pacientes/:id`: patient details, overview, clinical timeline.
- `/clinicas`: clinic CRUD and linked psychologists.
- `/financeiro`: financial dashboard, transactions, CSV import.
- `/documentos`: document/model library.
- `/pagamentos`: coming soon.
- `/contratos`: redirects to `/documentos`.
- `/prontuarios`: redirects to `/documentos`.
- `/exames`: coming soon.
- `/buscar`: coming soon.
- `/configuracoes`: coming soon.

