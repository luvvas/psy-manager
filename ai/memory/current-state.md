# Current State

Updated 2026-11-19. Only what the code and `git log` do not tell: known gaps,
behaviors that look wrong but are pinned on purpose, and things verified as correct
that should not be "fixed". Snapshot facts (migration count, test counts, versions)
live in the repo itself.

## Release Process

The **commit history is the source of truth** for release notes; there is no
hand-maintained changelog. `CONTRIBUTING.md` has the format and release steps,
`.githooks/commit-msg` validates (each clone runs `git config core.hooksPath .githooks`
once), `scripts/release-notes.sh` generates notes, `.github/workflows/release.yml`
publishes on `v*` tags. The `v1.0.0` release body lists features that no longer exist
(Redis cache, Electron app): historical noise.

## Feature Flags

`pagamentos` is merged in `master` but ships **off**: it only appears for an account
with a row in `feature_flag_override` (`flag_key = 'pagamentos'`, `psychologist_id`,
`enabled = true`), or after `feature_flag.enabled`/`rollout_percent` is raised.
Decision order: override → `enabled` → stable 0–99 bucket of `key:userId` below
`rollout_percent`.

## Pinned "Lacuna Conhecida" Behaviors

Current behavior, questionable, pinned by integration tests. Changing them is product
work, not a "fix" to slip in:

- A non-numeric `patient.valorSessao` passes validation; the event is stored, the
  projection insert fails, the EventBus swallows it and the API answers success.
  The patient never shows up. Same family: `financial.amount` non-numeric is a 500.
- Deleting a patient cascades appointments in the read model, but their aggregates
  stay alive in the event store.
- A removed clinic member's room sessions stay visible (without patient data) to
  the remaining members and keep blocking the room.
- Room names can repeat in the API; only the web checks duplicates.
- A clinical record accepts an `appointmentId` of another patient of the same
  psychologist.
- `videoSession.end` and `financial.update/delete` on someone else's row answer
  success/null instead of NOT_FOUND (nothing is changed).

Not covered yet (needs concurrency tests that are hard to make deterministic):

- The clinical-record lock is check-then-write (UPDATE/DELETE don't filter by
  `status`); FK cascades from patient/account deletion also remove finalized records.
- No unique index on `psychologist_clinic (clinic_id, psychologist_id)`; concurrent
  invites can duplicate.

## Security

Audit findings from September and November 2026 (issues #35–#41, `fix/audit-2026-11`
F1–F7) are all merged. Re-run the `security-audit` or `cloudflare-security-audit`
skill before trusting this as complete.

Verified as correct, do not "fix": every tRPC procedure requires a session except
`videoSession.validateToken`; CQRS aggregates enforce ownership; patient, document,
clinical-record, financial and clinic reads are scoped by `psychologistId`;
clinic-shared appointments strip patient PII.

Missing (product work, not bugs): two-factor auth, an access log for clinical records.

## Known Gaps And Watchpoints

- `better-auth` is pinned to `~1.6.30`. Do not move to 1.7.x casually: it requires an
  `Account.issuer` column the schema does not have, plus a Drizzle schema regeneration.
- The API image's `bun install` rewrites the lockfile at build time, because the deps
  stage does not copy `apps/web/package.json`. The image's dependency tree is not
  guaranteed to match what CI tested.
- The documents page calls `document.list` with an empty filter; verify intended
  generic-vs-patient filtering before changing document library behavior.
- Appointment reminders are **not sent**. The old WhatsApp reminder (EventBridge +
  Lambda) left with the AWS exit and there is no scheduler on the VPS. The columns
  `appointment.reminderEnabled`/`reminderMinutesBefore`/`reminderSentAt` stay (and the
  API still accepts them) so reminders can return without a migration; the UI hides them.
- The source code has no comments by design and ESLint is at 0 problems.
