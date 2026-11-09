# Backend Guidelines

## tRPC Procedure Pattern

Use the existing API style:

1. Add or edit a route file in `apps/api/src/routes/`.
2. Use `protectedProcedure` for authenticated data.
3. Validate inputs with Zod.
4. Delegate business logic to a service or CQRS command/query.
5. Scope reads/writes by `ctx.session.user.id`.
6. Return small plain objects or selected DB rows.

Root router: `apps/api/src/routes/router.ts`

## When To Use CQRS

Patients and appointments currently use CQRS/event sourcing. For these domains:

- Writes should go through command handlers in `apps/api/src/cqrs/...`.
- Reads should go through query handlers.
- Avoid direct projection table writes unless you are editing the projection
  subscriber itself.
- Update aggregate, command, event, and projection code together when adding
  fields or behavior.

## When To Use Services

Use services for modules that already follow the service pattern:

- `psychologist.service.ts`
- `clinic.service.ts`
- `financial.service.ts`
- `document.service.ts`
- `clinical-record.service.ts`
- `storage.service.ts`
- `google-calendar.service.ts`

Routers should stay thin. Services should own database operations and business
rules.

## Database And Migrations

- Schema lives in `apps/api/src/db/schema.ts`.
- Drizzle config lives in `apps/api/drizzle.config.ts`.
- Generated SQL migrations live in `apps/api/drizzle/`.
- Use root scripts for migration work:
  - `bun run db:generate`
  - `bun run db:migrate`
  - `bun run db:push`

For schema changes, update the TypeScript schema and generate a migration.

## Storage Rules

- Storage supports local development and S3 production.
- `storage.service.ts` validates PDF type and maximum size.
- Do not bypass `createUploadTarget` or `createReadUrl` for document access.
- Avoid exposing raw storage keys to users except as internal metadata.

## Google Calendar

Google Calendar support lives in:

- `apps/api/src/routes/appointment.ts`
- `apps/api/src/services/google-calendar.service.ts`
- `apps/web/src/pages/google-callback.tsx`
- `apps/web/src/features/agendamento/page.tsx`

The sync reads the primary calendar over a per-psychologist window
(`user.googleSyncDaysBack`/`googleSyncDaysAhead`, default 30/90, set in the
profile's Expediente tab) and never imports on its own guess. Each series (`recurringEventId`, or the
event id for single events) gets one decision in `google_event_link`: a patient
(imports every occurrence, now and in later syncs) or `patientId: null`
(ignored, never shown again). Undecided series come back as `pending` for the
review sheet; the name match is only a suggestion. All-day and cancelled events
are skipped. Times are converted with `localTime` (`America/Sao_Paulo`), never
with the server's timezone (production containers run in UTC). Google tokens in
`account` are encrypted with `encryptField`; `decryptField` still reads old
plaintext rows.

## Error Handling

- Use `TRPCError` when the client should receive a specific tRPC error code.
- Preserve Portuguese user-facing error messages where they are shown directly.
- Avoid leaking internal details or secrets in client-facing messages.

## Security Notes

- Never read or paste real `.env` values in prompts or docs.
- Keep tenant boundaries clear: default to filtering by logged-in psychologist.
- Be extra careful around clinical records, document downloads, and clinic
  membership operations.

