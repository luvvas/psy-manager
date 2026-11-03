# Current State

Generated on: 2026-09-02 · updated 2026-11-03 (AWS exit, security fixes)

## Repo Snapshot

- Bun workspace monorepo: `apps/api` and `apps/web` are the workspace members.
  `apps/lambda` was removed with the AWS exit.
- `packages/` no longer exists. `packages/shared` was removed — it was declared
  as a dependency by api and web but nothing imported it.
- `apps/desktop` (Electron) was removed. Distribution is web-only for now.
- Bun lockfile is present. Local `node_modules` is present.
- Drizzle migrations run through `0018_clever_ghost_rider.sql` (19 files).
- Versions: all three `package.json` at `1.0.1`. Tags `v1.0.0` and `v1.0.1`.

## Release Process

The **commit history is the source of truth** for release notes. There is no
hand-maintained changelog — `apps/web/src/data/changelog.ts` and the
`/atualizacoes` page were removed.

- `CONTRIBUTING.md` — Conventional Commits format, types, canonical scopes,
  breaking changes, and the release steps.
- `.githooks/commit-msg` — dependency-free validator. Each clone must run
  `git config core.hooksPath .githooks` once.
- `scripts/release-notes.sh` — generates Markdown notes between two refs.
- `.github/workflows/release.yml` — publishes a GitHub Release on `v*` tags.

Note: the `v1.0.0` release body was generated from the full history, so it lists
features that no longer exist (Redis cache, Electron app). Treat it as historical
noise, not a description of the product.

## Git State At Scan Time

`.gitignore` has uncommitted user changes (adds `docs` and `.venv/`). Treat it as
user work in progress and do not commit it without being asked.

## Test Coverage

52 tests passing across 11 files. Route coverage is 100% lines on all route
files. Run with `bun test --coverage`.

Key gaps that still require integration tests (DB not exercised by any test):
- Drizzle queries, migrations, and transactions.
- CQRS event store persistence and optimistic concurrency (`lib/cqrs/index.ts`).
- Encryption/decryption helpers (`lib/encryption.ts`).
- Pagination and complex filter combinations on list endpoints.
- **Rate limiting.** Issue #39 exists precisely because no test exercised the
  real auth routes, so two limiters sat inert for months.

## Security Findings

The September 2026 audit (`docs/security-audit/`, local only) opened issues
#35–#41. Their fix branches (`fix/36-ownership-ids`, `fix/37-psychologist-list`,
`fix/38-storage-key-ownership`, `fix/39-auth-rate-limiters`,
`fix/40-env-validation`, `fix/url-scheme-validation`) and the November follow-up
`fix/audit-2026-11` (F1–F7: clinic invites with acceptance, OAuth state, CSP in
Report-Only, refusal to boot with a leaked `BETTER_AUTH_SECRET`) are all merged
into `master`. `.env.prod` is covered by `.gitignore` (#35). Re-run the
`security-audit` skill before trusting this list as complete.

Verified as correct during the same audit, so do not "fix" these: all 40 tRPC
procedures require a session except `videoSession.validateToken`; CQRS aggregates
enforce ownership; patient/document/clinical-record/financial/clinic reads are
scoped by `psychologistId`; clinic-shared appointments strip patient PII.

## Known Gaps And Watchpoints

- `better-auth` is pinned to `~1.6.30`. Do not move to 1.7.x casually: it
  requires an `Account.issuer` column that the schema does not have, plus a
  Drizzle schema regeneration.
- The API image's `bun install` rewrites the lockfile at build time, because the
  deps stage does not copy `apps/web/package.json`. The image's dependency tree
  is therefore not guaranteed to match what CI tested.
- Patient and appointment writes use CQRS; direct DB writes can bypass event
  history and projections.
- Clinical records have finalization rules; finalized records should stay locked.
- Document and clinical PDF access should go through storage read URLs.
- Clinic membership actions should be reviewed carefully for authorization
  boundaries.
- The documents page currently calls `document.list` with an empty filter; verify
  intended generic-vs-patient filtering before changing document library behavior.
- **AWS exit done** (PR #45, Nov 2026): production runs on a Hostinger VPS +
  Cloudflare (Tunnel, Access, R2, TURN) with images in GHCR. The WhatsApp reminder
  feature (EventBridge + Lambda) was removed. `docs/progress/00–14` describe the
  AWS era and are historical.
- **Web refactor (Nov 2026, phases 0–7, see `ai/tasks/task-web-fase-*.md`):** routes are
  lazy and imported per page file (no feature barrels); vendor chunks (`vendor-react`,
  `vendor-data`) are split from app code; source maps go only to Sentry. Types come from
  `RouterOutputs`/`RouterInputs`; query defaults live in `lib/query-client.ts` (retry
  policy, 401 → /login, 30 s staleTime) and mutations invalidate every affected router.
  ESLint is at 0 problems and the source code has no comments by design.
- `appointment.reminderEnabled`/`reminderMinutesBefore`/`reminderSentAt` columns
  are kept (and still accepted by the API) so reminders can come back without a
  migration; the UI no longer exposes them.
