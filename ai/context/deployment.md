# Deployment Context

## Local Development

Local development uses:

- Vite dev server for the web app.
- Hono/tRPC API on port `3001`.
- Docker Compose Postgres on port `5432`.

Useful commands:

```bash
bun run docker:db
bun run dev
```

## Production Shape

> Production left AWS in November 2026 (PR #45; runbook in the maintainer's local notes,
> outside git). Nothing runs on AWS anymore.

- One VPS (Hostinger KVM 1, São Paulo, Ubuntu 24.04) running Docker Compose:
  `db` (`postgres:17-alpine`), `api` and `web` (nginx serving the Vite build and
  proxying `/api`, `/trpc`, `/ws` to the API).
- **No inbound ports.** `cloudflared` runs as a host systemd service (not in
  Compose, so SSH survives a broken Docker) and routes `app.<domain>` →
  `localhost:8080` (the only published port, bound to 127.0.0.1) and
  `ssh.<domain>` → `localhost:22`, the latter behind Cloudflare Access.
- SPA and API share one origin, which keeps the session cookie `SameSite=Lax`.
  The web build leaves `VITE_API_URL` empty on purpose.
- Cloudflare in front: TLS, WAF managed rules, Bot Fight Mode, a rate-limit rule
  on sign-in, cache rules (bypass `/api`, `/trpc`, `/ws`).
- Client IP comes from `cf-connecting-ip` (trusted because the origin is only
  reachable through the Tunnel).
- Documents: Cloudflare R2 through the S3 SDK (`S3_*` env vars, token scoped to
  one bucket).
- TURN: Cloudflare Realtime TURN, short-lived credentials generated per call in
  `apps/api/src/routes/video-session.ts`.
- Secrets: one GitHub environment secret, `PROD_ENV_FILE` (template:
  `.env.prod.example`), written to `~/psy-manager/.env.prod` (mode 600) on each
  deploy.
- Sign-up is invite-only in production (`BETA_INVITE_ONLY`, default `true` in
  `docker-compose.prod.yml`). Invite with
  `docker compose -f docker-compose.prod.yml exec api bun src/db/beta-invite.ts add <email>`.
- E-mail: forgot-password needs the `SMTP_*` variables in `PROD_ENV_FILE`; without
  `SMTP_HOST` the API only logs `[email] SMTP não configurado` and the user still
  sees the success message.
- Backups: `scripts/backup-db.sh` (cron, 03:00) → `pg_dump | gzip [| age]` →
  separate R2 bucket with a 90-day lifecycle rule.

## GitHub Actions

### `.github/workflows/ci.yml` (quality gate)

Trigger: every pull request into `master`, and `workflow_call` from
`deploy.yml` (so the same checks run again on `master` before a deploy). On PRs,
a new push cancels the previous run. Bun is pinned (`BUN_VERSION`); bump it here,
in `deploy.yml` and in `dependabot-lockfile.yml` together.

Jobs run in parallel:

- `static`: ESLint (web), `tsc -b` (web), `build:api` (API `tsc`), e2e typecheck.
- `test`: unit tests of api and web with `--coverage` (report only, no
  threshold yet), then the API integration suite (Postgres as a service).
- `e2e`: Postgres as a service, Playwright Chromium, `bun run test:e2e`. The
  browser lives in an `actions/cache` keyed by the Playwright version; on a hit
  only the apt deps are installed (`playwright install-deps`). Uploads the report
  and traces when it fails.
- `guard` (PRs only): `scripts/ci-guard.sh` fails when the PR deletes a test file
  or adds `.skip(`/`.only(`/`.todo(`/`.fixme(` to a test file (only added lines
  count, so the existing conditional skip in `teleconsulta.spec.ts` is fine). The
  PR label `allow-skip` downgrades a new skip to a warning. It also labels the PR
  `caminho-protegido` when it touches CI, Docker, scripts, hooks, manifests, the
  lockfile, migrations, `auth.ts` or the Playwright config: those PRs get a
  manual review instead of auto-merge.
- `supply-chain`: `bun audit --audit-level=critical` (blocking, minus the IDs in
  `.bun-audit-ignore`), a non-blocking `high` report, and
  `actions/dependency-review-action` on PRs (fails on new `high`+ advisories).
  `.bun-audit-ignore` holds advisories that only reach dev tooling (`concurrently`
  → `shell-quote`, `shadcn` CLI → `proxy-addr`), never the production images.
- `gate`: needs all of the above, fails unless each one is `success` or
  `skipped`. **This is the only required status check** on `master`, so jobs can
  be added or renamed without touching the ruleset.

Not in the gate yet: Prettier (formatting the whole repo is its own PR) and
mutation testing (Stryker has no `bun test` runner; a weekly report-only run is
the plan).

### Branch protection (GitHub settings, not in the repo)

Ruleset on `master`: require a pull request, require the `gate` status check
with the branch up to date, block force pushes and deletions. "Allow auto-merge"
is on; `gh pr merge --auto --merge` merges when `gate` is green. PRs labeled
`caminho-protegido` are reviewed and merged by hand.

Known gap: `dependabot-lockfile.yml` pushes the regenerated `bun.lock` with
`GITHUB_TOKEN`, and pushes made with that token do not start workflows, so the
`gate` does not run on that last commit. Close and reopen the PR (or push an
empty commit) to trigger it.

### `.github/workflows/deploy.yml`

Trigger: push to `master` (excluding `docs/**`, `**.md`, `ai/**`) or manual
dispatch. Serialized by a `deploy-production` concurrency group.

Jobs:

- `ci`: calls `ci.yml` (all the gates above; `guard` and dependency review are
  skipped outside PRs).
- `build-api-image`: build `docker/Dockerfile.api` (target `production`), scan
  with Trivy, push to GHCR, output the immutable digest.
- `build-web-image`: build the SPA (with Sentry secrets), package `dist/` +
  `docker/nginx.conf` into `docker/Dockerfile.web` from a dedicated build
  context (the root `.dockerignore` excludes `dist/` and `docker/`), scan, push,
  output the digest.
- `deploy` (environment `production`, needs `ci` and both images): SSH through Cloudflare Access with a
  service token (`cloudflared access ssh` as ProxyCommand), upload the compose
  file, scripts and `.env.prod`, log the VPS in to GHCR with the job's
  `GITHUB_TOKEN` over stdin, run `scripts/deploy.sh <api-digest> <web-digest>`,
  then log out. `deploy.sh` pulls, restarts, migrates and smoke-tests
  `/api/health` from inside the `web` container.

The VPS keeps no git checkout.

### `.github/workflows/release.yml`

Trigger: push of a `v*` tag.

Runs `scripts/release-notes.sh` over the range since the previous tag and
publishes a GitHub Release with the generated notes. **Tags do not deploy** —
deployment is driven solely by pushes to `master`.

## Docker

Local compose:

- `docker-compose.yml` starts Postgres.

Production compose:

- `docker-compose.prod.yml` runs Postgres, the API image (`${API_IMAGE}`) and
  the web image (`${WEB_IMAGE}`). It never builds from source.

Dockerfiles:

- `docker/Dockerfile.api` — built by CI, scanned, pushed to GHCR.
- `docker/Dockerfile.web` — nginx + prebuilt `dist/`; built by CI from its own
  context.

### Migrations

`apps/api/src/db/migrate.ts` applies migrations with **drizzle-orm's** migrator,
not the `drizzle-kit` CLI. Both track state in `drizzle.__drizzle_migrations`, so
they are interchangeable — this was verified against a real database. The reason
for the switch: `drizzle-kit` is a devDependency, and needing it at runtime
forced the production image to ship the whole build toolchain.

`bun run db:migrate` now runs that script everywhere — locally and in the
container. `drizzle-kit` is still used for `db:generate`, `db:push` and
`db:studio`, which are development-only.

The production image prunes `drizzle-kit`, `tsx`, `typescript` and the `esbuild`
packages after install. `bun install --production` does not do this: it drops
root devDependencies but not those of workspace members.

### `.dockerignore` is a security boundary

The production stage does `COPY . .`, so anything not excluded lands in the
image published to GHCR. `.ssh/`, `*.pem`, `*.key`, `.env*`, `.csv/`, `docs/` and
`ai/` are excluded for that reason, not merely to save space. Before adding a
new top-level directory holding anything sensitive, add it to `.dockerignore`.

## Related Docs

- `CONTRIBUTING.md` — commit convention, versioning, and the release process.
