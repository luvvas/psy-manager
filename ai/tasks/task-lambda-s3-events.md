# Task: Lambda + S3 Events — Validação e Notificações de Documentos

Status: draft

## Goal

When a file lands in the S3 documents bucket, an AWS Lambda function wakes up and
runs two behaviors automatically:

1. **File validation:** checks that the uploaded PDF is valid and not
   password-protected; marks the record `invalid` in the database if it is not.
2. **Upload notification:** when the uploaded object is under the `exams/` prefix,
   sends an email to the owning psychologist via AWS SES.

No EC2 process is kept running for this; the Lambda only runs for milliseconds per
event.

## Context

Relevant files:

- `apps/api/src/db/schema.ts` — `document`, `clinical_record`, `exam` tables
- `apps/api/src/services/storage.service.ts` — S3 bucket name and key conventions
- `apps/api/src/db/index.ts` — DB connection pattern (replicate in Lambda)
- `step-by-step.md` section 12 — S3 bucket and IAM configuration reference
- S3 key prefixes in use:
  - `documents/{psychologistId}/{uuid}.pdf` — generic documents and clinical records
  - `exams/{psychologistId}/{uuid}.{ext}` — exams (added in task-exames-upload)

Existing behavior:

- Uploads go directly from the browser to S3 via presigned PUT URLs.
- After the PUT completes, the frontend calls a tRPC mutation to save metadata.
- There is currently no server-side processing after the object lands in S3.

## Requirements

### Lambda Function (`lambda/doc-processor/`)

Create a new top-level `lambda/` folder in the monorepo:

```
lambda/
  doc-processor/
    index.ts        # handler
    pdf-validator.ts
    notifier.ts
    package.json
    tsconfig.json
```

**Handler (`index.ts`):**
- Receives `S3Event` from AWS.
- For every record in the event:
  - Extracts bucket name and object key.
  - Calls `validateFile(key, bucket)` for all keys.
  - If key starts with `exams/`, additionally calls `notifyPsychologist(key)`.

**PDF Validator (`pdf-validator.ts`):**
- Downloads the first 1 KB of the S3 object (`GetObjectCommand` with byte range).
- Checks that the file starts with `%PDF-`.
- If invalid, resolves the `psychologistId` and record `id` from the key, then
  updates the matching row in `document`, `clinical_record`, or `exam` setting a
  `status` column to `invalid`.

**Notifier (`notifier.ts`):**
- Resolves `psychologistId` from the key prefix (`exams/{psychologistId}/...`).
- Queries the `user` table for the psychologist's email and name.
- Queries the `exam` table for the patient name linked to the exam record.
- Sends an email via `@aws-sdk/client-ses`:
  - Subject: `Novo exame adicionado — [Nome do Paciente]`
  - Body: plain text in pt-BR.

**Dependencies:** `@aws-sdk/client-s3`, `@aws-sdk/client-ses`, `drizzle-orm`,
`postgres` (same versions as `apps/api`).

### Database Schema Change

Add `status` column to `document`, `clinical_record`, and `exam` tables:

```sql
status varchar default 'ok' -- 'ok' | 'invalid'
```

Generate and run Drizzle migration.

### Frontend

- Show a warning badge (e.g. amber triangle icon) next to any document, clinical
  record, or exam where `status === 'invalid'`.
- Tooltip/label: "Arquivo inválido ou corrompido."

### AWS Infrastructure

- Create an S3 event notification on the documents bucket:
  - Event type: `s3:ObjectCreated:*`
  - Destination: Lambda function ARN
- Add an IAM execution role for the Lambda with:
  - `s3:GetObject` on the documents bucket
  - `ses:SendEmail`
  - `secretsmanager:GetSecretValue` or `ssm:GetParameter` to retrieve
    `DATABASE_URL`
- Verify an email address or domain in SES (required for sending in sandbox mode).

## Constraints

- Keep user-facing text in pt-BR.
- Lambda must not store credentials on disk; retrieve `DATABASE_URL` from SSM
  Parameter Store at cold start.
- Lambda timeout: 10 seconds maximum per invocation.
- Do not block the upload flow — Lambda runs asynchronously after the PUT completes.
- Do not touch unrelated modules.

## Acceptance Criteria

- Uploading a valid PDF sets `status = 'ok'`; no badge shown.
- Uploading a non-PDF (e.g. a `.txt` renamed to `.pdf`) sets `status = 'invalid'`;
  warning badge appears in the UI.
- Uploading an exam sends an email to the psychologist's registered address.
- Lambda execution logs are visible in CloudWatch.
- `bun run build` passes with no type errors.

## Suggested Verification

```bash
bun run build
# deploy Lambda and configure S3 trigger
# upload a valid PDF exam → check no badge, check email received
# upload a corrupted file → check invalid badge appears in UI
# check CloudWatch logs for Lambda execution
```