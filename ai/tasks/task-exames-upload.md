# Task: Módulo de Exames — Upload via S3 Pre-signed URLs

Status: draft

## Goal

Replace the `/exames` coming-soon placeholder with a working exam management
module. Psychologists can upload exam files (PDF, JPEG, PNG) for a patient. Files
go directly from the browser to S3 using a pre-signed PUT URL, following the same
pattern as `document` and `clinical_record`.

## Context

Relevant files:

- `apps/api/src/services/storage.service.ts` — presigned URL generation (currently PDF-only)
- `apps/api/src/routes/document.ts` — reference implementation for upload flow
- `apps/api/src/db/schema.ts` — add `exam` table here
- `apps/api/src/routes/router.ts` — register new `examRouter`
- `apps/web/src/features/pacientes/page-detalhes.tsx` — add Exames tab
- `apps/web/src/router.tsx` — `/exames` route currently renders coming-soon

Existing behavior:

- `storage.service.ts` generates presigned PUT URLs for S3 under key
  `documents/{psychologistId}/{uuid}.pdf`.
- The service rejects non-PDF files; this restriction must be relaxed for exams.
- `document.prepareUpload` is the reference tRPC mutation.

## Requirements

### Backend

- Add `exam` table to `apps/api/src/db/schema.ts`:
  - `id`, `psychologistId`, `patientId`
  - `title`, `type` (e.g. `psicologico`, `neurologico`, `outro`)
  - `date` (date of the exam)
  - `storageKey`, `fileName`, `mimeType`, `fileSize`
  - `notes` (optional text)
  - `createdAt`, `updatedAt`
- Generate and run a Drizzle migration.
- Extend `storage.service.ts` to accept `image/jpeg`, `image/png`, and
  `application/pdf` when the caller passes `allowImages: true`.
- Create `apps/api/src/services/exam.service.ts` with:
  - `prepareUpload(psychologistId, patientId, fileName, mimeType, fileSize)`
  - `create(data)` — saves metadata after upload
  - `list(psychologistId, patientId)` — returns exams for a patient
  - `delete(id, psychologistId)` — deletes metadata and S3 object
- Create `apps/api/src/routes/exam.ts` with tRPC procedures:
  - `exam.prepareUpload`
  - `exam.create`
  - `exam.list`
  - `exam.delete`
- Register `examRouter` in `apps/api/src/routes/router.ts`.

### Frontend

- Create `apps/web/src/features/exames/` feature folder.
- Add an **Exames** tab to the patient details page
  (`apps/web/src/features/pacientes/page-detalhes.tsx`).
- Tab contents:
  - List of exams: thumbnail for images, PDF icon for PDFs, title, type, date.
  - Upload button: opens a file picker (PDF/JPEG/PNG, max 10 MB), calls
    `exam.prepareUpload`, uploads directly to S3, then calls `exam.create`.
  - Delete button per item (with confirmation dialog).
- Replace the `/exames` coming-soon page with a redirect or a global exam view
  (optional stretch).

## Constraints

- Keep user-facing text in pt-BR.
- Follow patterns in `apps/api/src/routes/document.ts` and
  `apps/web/src/features/documentos/`.
- Do not change the existing `storage.service.ts` PDF path for documents or
  clinical records — only extend it.
- Do not touch unrelated modules.
- S3 key prefix for exams: `exams/{psychologistId}/{uuid}.{ext}`.

## Acceptance Criteria

- A psychologist can upload a JPEG, PNG, or PDF exam for a patient.
- The file goes directly to S3; the API receives only metadata.
- The exam appears in the patient's Exames tab immediately after upload.
- Deleting an exam removes both the S3 object and the DB record.
- Files above 10 MB are rejected with a user-visible error message.
- `bun run build` passes with no type errors.

## Suggested Verification

```bash
bun run build
# upload a PDF and a JPEG exam for a test patient
# verify the files appear in the S3 bucket under exams/
# verify the exam appears and is deletable in the UI
```
