# Current State

Generated on: 2026-09-02

## Repo Snapshot

- Bun workspace monorepo: `apps/api` and `apps/web` are the workspace members.
  `apps/lambda/reminder-sender` exists but is not a workspace member (no
  `package.json` at the `apps/lambda` level).
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

## Open Security Findings

A code audit in September 2026 produced `docs/security-audit/` (PDF plus the
generator script) and seven open GitHub issues. None are fixed yet:

- **#35** `.env.prod` holding production secrets is not covered by `.gitignore`,
  in a public repo. Highest severity.
- **#36** Client-supplied reference IDs are not ownership-checked
  (`financial.patientId` leaks decrypted patient names across tenants;
  `document.patientId`; `videoSession.appointmentId`).
- **#37** `psychologist.list` returns every user on the platform, unfiltered.
- **#38** Client-supplied `storageKey` yields a presigned URL for any object in
  the bucket.
- **#39** Login and password-reset rate limiters are registered on paths that
  never match the real Better Auth routes.
- **#40** Default Postgres password in the dev compose; no startup validation
  rejecting missing or default secrets.
- **#41** User-controlled URLs reach `window.open` and an iframe `src` without a
  scheme allowlist (self-XSS today).

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
- `GOOGLE_CLIENT_ID` is not stored in SSM; verify it is set via another mechanism
  on EC2 or add it as a non-secret SSM parameter.
- Production runs Postgres in a container on EC2, not RDS, and has no Redis.
  Several files under `docs/` still describe both as live.
