# Task: WhatsApp Appointment Reminder

Status: implemented — pending AWS/Meta setup

## Architecture

```
Psychologist saves appointment with reminderEnabled + reminderMinutesBefore
  → API (reminder-scheduler.service.ts) creates a one-time EventBridge Schedule
  → EventBridge Scheduler fires at (appointmentTime - X minutes) → invokes Lambda
  → Lambda (apps/lambda/reminder-sender/) calls Meta WhatsApp Business Cloud API
  → Lambda calls POST /api/internal/reminder-callback with X-Callback-Secret header
  → API stamps appointment.reminderSentAt in DB
```

## AWS Services Used (SAA-C03 topics)

- **EventBridge Scheduler** — one-time schedules (`at(yyyy-MM-ddTHH:mm:ss)` UTC expression)
- **Lambda** — Node.js 20.x function, IAM execution role, env vars
- **IAM** — two roles: API role (create/delete schedules), Lambda execution role (invoke Scheduler + no special perms for Meta API call)

## Files Changed

| File | Change |
|---|---|
| `apps/api/src/db/schema.ts` | Added `reminderEnabled`, `reminderMinutesBefore`, `reminderSentAt` to `appointment` |
| `apps/api/drizzle/0018_clever_ghost_rider.sql` | Migration for the 3 new columns |
| `apps/api/src/cqrs/appointment/appointment.aggregate.ts` | Added reminder fields to state + events |
| `apps/api/src/cqrs/appointment/appointment.commands.ts` | Added reminder fields to commands |
| `apps/api/src/cqrs/appointment/appointment.projections.ts` | Writes reminder fields on insert/update |
| `apps/api/src/cqrs/appointment/appointment.queries.ts` | Selects reminder fields in ownRows; null defaults for shared rows |
| `apps/api/src/services/reminder-scheduler.service.ts` | **New** — EventBridge Scheduler client |
| `apps/api/src/routes/appointment.ts` | create/update/delete call scheduler service |
| `apps/api/src/index.ts` | Added `POST /api/internal/reminder-callback` Hono route |
| `apps/api/package.json` | Added `@aws-sdk/client-scheduler` |
| `apps/lambda/reminder-sender/index.ts` | **New** — Lambda handler |
| `apps/lambda/reminder-sender/package.json` | **New** — esbuild bundler |
| `apps/web/src/features/agendamento/types.ts` | Reminder fields on `Appointment` |
| `apps/web/src/features/agendamento/components/appointment-form.tsx` | Reminder toggle + time select |
| `apps/web/src/features/agendamento/components/appointment-card.tsx` | Bell/BellCheck indicator |
| `apps/web/src/features/agendamento/page.tsx` | Maps + passes reminder fields |
| `.env.example` | Documented 6 new env vars |

## Setup Required Before This Feature Works

### 1. Meta Business (one-time)
1. Create account at https://business.facebook.com (Psy Manager account)
2. Verify the business (~1–3 business days)
3. Register a dedicated WhatsApp Business phone number
4. Create and submit the message template for Meta approval (~24h):
   ```
   Name: appointment_reminder
   Language: pt_BR
   Body: "Olá {{1}}, lembramos que você tem uma consulta com {{2}} em {{3}} às {{4}}. Qualquer dúvida, entre em contato."
   ```
5. After approval, get from Meta Business Manager:
   - `META_PHONE_NUMBER_ID` — the registered phone number's ID
   - `META_API_TOKEN` — a permanent System User access token

### 2. AWS Lambda
1. Create function `psy-manager-reminder-sender`, runtime Node.js 20.x
2. Build and upload the bundle:
   ```bash
   cd apps/lambda/reminder-sender
   bun install
   bun run build
   # Upload dist/index.mjs as Lambda code (zip it)
   ```
3. Set Lambda environment variables (from `.env.example` WhatsApp section):
   - `META_PHONE_NUMBER_ID`
   - `META_API_TOKEN`
   - `WHATSAPP_TEMPLATE_NAME=appointment_reminder`
   - `API_INTERNAL_URL` — your EC2 API URL (e.g. `https://api.psy-manager.com.br`)
   - `LAMBDA_CALLBACK_SECRET` — same value as in API `.env`
4. Handler: `index.handler`
5. Timeout: 30s (Meta API + callback call)
6. Copy the Lambda ARN → `AWS_REMINDER_LAMBDA_ARN` in API env

### 3. AWS IAM — Lambda execution role
The Lambda execution role needs:
```json
{
  "Effect": "Allow",
  "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
  "Resource": "arn:aws:logs:*:*:*"
}
```
No other AWS permissions needed (Lambda calls Meta API via HTTPS and calls back the API via HTTPS — no AWS resources needed beyond CloudWatch logs).

### 4. AWS IAM — EventBridge Scheduler role
Create a role `psy-manager-scheduler-role` that EventBridge Scheduler assumes:
- **Trust policy**: principal `scheduler.amazonaws.com`
- **Permission**: `lambda:InvokeFunction` on the Lambda ARN
- Copy role ARN → `AWS_EVENTBRIDGE_SCHEDULER_ROLE_ARN` in API env

### 5. AWS EventBridge Scheduler — schedule group
Create a schedule group named `psy-manager-reminders` in the AWS Console or via CLI:
```bash
aws scheduler create-schedule-group --name psy-manager-reminders
```

### 6. API IAM permissions
The EC2 instance role (or IAM user used by the API) needs:
```json
{
  "Effect": "Allow",
  "Action": [
    "scheduler:CreateSchedule",
    "scheduler:DeleteSchedule",
    "iam:PassRole"
  ],
  "Resource": [
    "arn:aws:scheduler:sa-east-1:ACCOUNT_ID:schedule/psy-manager-reminders/*",
    "arn:aws:iam::ACCOUNT_ID:role/psy-manager-scheduler-role"
  ]
}
```

### 7. Run DB migration
```bash
cd apps/api && bun run db:migrate
```

## Dev / Local Environment

EventBridge Scheduler runs in AWS cloud — it cannot invoke a localhost Lambda.
In dev:
- Leave `AWS_REMINDER_LAMBDA_ARN` and `AWS_EVENTBRIDGE_SCHEDULER_ROLE_ARN` **blank** — the scheduler service logs a warning and skips silently
- The reminder UI (toggle + select) works and persists to DB, but no EventBridge schedule is created
- `reminderSentAt` will never be stamped locally unless you hit the callback endpoint manually

## Timezone note

`startTime` is treated as America/Sao_Paulo (UTC-3) in `reminder-scheduler.service.ts`.
This is correct for the Brazilian market. If multi-timezone support is ever needed, store
the IANA timezone on the psychologist or appointment record and use it here.
