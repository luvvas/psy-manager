# API Surface

Root router: `apps/api/src/routes/router.ts`

```ts
export const appRouter = router({
  psychologist,
  patient,
  appointment,
  clinic,
  financial,
  document,
  clinicalRecord,
});
```

## `psychologist`

File: `apps/api/src/routes/psychologist.ts`

- `me`: protected query. Returns the current psychologist profile.
- `updateProfile`: protected mutation. Updates `name`, `phone`, `crp`, `city`.

Service: `apps/api/src/services/psychologist.service.ts`

## `patient`

File: `apps/api/src/routes/patient.ts`

- `list`: protected query. Lists patients for the current psychologist.
- `getById`: protected query. Gets one patient by id and current psychologist.
- `create`: protected mutation. Creates a patient through CQRS.
- `update`: protected mutation. Updates a patient through CQRS.
- `delete`: protected mutation. Deletes a patient through CQRS.

CQRS files:

- `apps/api/src/cqrs/patient/patient.commands.ts`
- `apps/api/src/cqrs/patient/patient.queries.ts`
- `apps/api/src/cqrs/patient/patient.aggregate.ts`
- `apps/api/src/cqrs/patient/patient.projections.ts`

## `appointment`

File: `apps/api/src/routes/appointment.ts`

- `list`: protected query. Lists appointments visible to the current
  psychologist, including shared clinic appointments.
- `create`: protected mutation. Schedules through CQRS.
- `update`: protected mutation. Reschedules through CQRS.
- `delete`: protected mutation. Cancels through CQRS.
- `isConnectedGoogle`: protected query. Checks for linked Google account.
- `syncGoogle`: protected mutation. Imports Google Calendar events.
- `getGoogleAuthUrl`: protected query. Builds OAuth URL.
- `connectGoogleCalendar`: protected mutation. Exchanges OAuth code and stores
  Google account tokens.

CQRS files:

- `apps/api/src/cqrs/appointment/appointment.commands.ts`
- `apps/api/src/cqrs/appointment/appointment.queries.ts`
- `apps/api/src/cqrs/appointment/appointment.aggregate.ts`
- `apps/api/src/cqrs/appointment/appointment.projections.ts`

Service:

- `apps/api/src/services/google-calendar.service.ts`

## `clinic`

File: `apps/api/src/routes/clinic.ts`

- `list`: protected query. Lists clinics linked to current psychologist.
- `create`: protected mutation. Creates clinic and auto-links creator.
- `update`: protected mutation. Updates clinic if current psychologist created it.
- `delete`: protected mutation. Deletes clinic if current psychologist created it.
- `linkPsychologist`: protected mutation. Links a psychologist by email.
- `unlinkPsychologist`: protected mutation. Removes a clinic-professional link.

Service: `apps/api/src/services/clinic.service.ts`

## `financial`

File: `apps/api/src/routes/financial.ts`

- `list`: protected query. Lists transactions for current psychologist, optional
  `startDate`/`endDate`.
- `create`: protected mutation. Creates one transaction.
- `createMany`: protected mutation. Bulk creates CSV-imported transactions.
- `update`: protected mutation. Updates one transaction.
- `delete`: protected mutation. Deletes one transaction.

Service: `apps/api/src/services/financial.service.ts`

## `document`

File: `apps/api/src/routes/document.ts`

- `prepareUpload`: protected mutation. Returns local or S3 upload target for PDF.
- `getDownloadUrl`: protected query. Returns a readable URL/content for a document.
- `list`: protected query. Optional `patientId` and `isTemplate` filters.
- `getById`: protected query. Gets one document.
- `create`: protected mutation. Creates document metadata/content.
- `update`: protected mutation. Updates document metadata/content.
- `delete`: protected mutation. Deletes document row.

Services:

- `apps/api/src/services/document.service.ts`
- `apps/api/src/services/storage.service.ts`

## `clinicalRecord`

File: `apps/api/src/routes/clinical-record.ts`

- `prepareUpload`: protected mutation. Returns local or S3 upload target for PDF.
- `getDownloadUrl`: protected query. Returns a readable URL/content for a record.
- `list`: protected query. Optional `patientId` filter.
- `getById`: protected query. Gets one clinical record.
- `create`: protected mutation. Creates a draft clinical record.
- `update`: protected mutation. Updates a draft record.
- `finalize`: protected mutation. Locks a record as finalized.
- `delete`: protected mutation. Deletes a draft record.

Services:

- `apps/api/src/services/clinical-record.service.ts`
- `apps/api/src/services/storage.service.ts`

## `featureFlags`

File: `apps/api/src/routes/feature-flags.ts`

- `list`: protected query. Map of known flags (`FEATURE_FLAGS` in
  `services/feature-flag.service.ts`) for the session: override → `enabled` →
  stable bucket (`sha256(key:userId) % 100`) below `rollout_percent`.
- `flaggedProcedure(key)` (`trpc/index.ts`) answers `FORBIDDEN` when off.

## `billing` (flag `pagamentos`)

File: `apps/api/src/routes/billing.ts`, service `services/billing.service.ts`

- `summary`: to receive, overdue, received this month, patients with balance.
- `receivables`: open charges grouped by patient.
- `patientStatement`: charges + payments of one patient (NOT_FOUND if not owned).
- `registerPayment`: in one transaction, locks the open charges (`FOR UPDATE`),
  creates a paid income in `financial_transaction`, a `payment`, and marks the
  charges paid. Any charge not open → BAD_REQUEST, nothing written.
- `undoPayment`: reopens the charges (drops the ones whose appointment is no longer
  `completed`), deletes the payment and its income. NOT_FOUND if not owned.
- `waiveCharge`: open → `waived`.

`financial.update/delete` refuse (BAD_REQUEST) to delete, or change type/amount/status/
patient of, an income created by a payment; the fix is `undoPayment`.
`psychologist.exportData` includes `charges` and `payments`.

Charges are created/removed by the appointment projections
(`billingService.syncChargeForAppointment`), not by the router.

## Non-tRPC HTTP Routes

File: `apps/api/src/app.ts` (WebSocket `/ws/signaling/:sessionId` in `apps/api/src/index.ts`)

- `POST/GET /api/auth/*`: Better Auth handler.
- `PUT /api/storage/local-upload/:token`: local PDF upload endpoint.
- `GET /api/storage/local-download/:token`: local PDF read endpoint.
- `/trpc/*`: tRPC endpoint.

