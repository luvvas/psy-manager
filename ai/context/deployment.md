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

> Production left AWS in November 2026 (PR #45, runbook:
> `docs/progress/15-saida-aws-cloudflare.md`). Nothing runs on AWS anymore.

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
- Backups: `scripts/backup-db.sh` (cron, 03:00) → `pg_dump | gzip [| age]` →
  separate R2 bucket with a 90-day lifecycle rule.

## GitHub Actions

### `.github/workflows/deploy.yml`

Trigger: push to `master` (excluding `docs/**`, `**.md`, `ai/**`) or manual
dispatch. Serialized by a `deploy-production` concurrency group.

Jobs:

- `quality-gate`: install dependencies, run unit tests (api + web) and the API
  integration suite (Postgres as a service), build the API.
- `e2e`: Postgres as a service, Playwright Chromium, `bun run test:e2e`; uploads
  the Playwright report and traces as an artifact when it fails.
- `build-api-image`: build `docker/Dockerfile.api` (target `production`), scan
  with Trivy, push to GHCR, output the immutable digest.
- `build-web-image`: build the SPA (with Sentry secrets), package `dist/` +
  `docker/nginx.conf` into `docker/Dockerfile.web` from a dedicated build
  context (the root `.dockerignore` excludes `dist/` and `docker/`), scan, push,
  output the digest.
- `deploy` (environment `production`, needs `quality-gate`, `e2e` and both images): SSH through Cloudflare Access with a
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

- `docs/progress/` — numbered write-ups of each infrastructure milestone.
  Entries 00–14 describe the AWS era and are historical;
  `15-saida-aws-cloudflare.md` is the current setup and its manual runbook.
- `CONTRIBUTING.md` — commit convention, versioning, and the release process.
