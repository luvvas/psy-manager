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

- API on AWS EC2, run with Docker Compose from a prebuilt image.
- **PostgreSQL runs as a container on the same EC2 instance**
  (`postgres:17-alpine` in `docker-compose.prod.yml`). RDS was implemented and
  then reverted for cost; older docs under `docs/` still describe it as live.
  The same applies to ElastiCache/Redis — there is no cache layer in production.
- Frontend static build on S3, served through CloudFront.
- CloudFront also proxies `/api/*` and `/trpc/*` to the EC2 origin, so the SPA
  and the API share one domain. This is what allows the session cookie to be
  `SameSite=Lax`.
- AWS SSM Parameter Store for secrets, read at deploy time by `scripts/deploy.sh`.
- S3 bucket for private document storage through presigned URLs.
- ECR stores the API image; deploys are pinned to an immutable digest.

## GitHub Actions

### `.github/workflows/deploy-ec2.yml`

Trigger: push to `master`, excluding `docs/**`, `**.md`, `ai/**` and the
lifecycle-policy JSON files.

Jobs:

- `quality-gate`: install dependencies, run the API test suite, build the API.
- `build-api-image`: build `docker/Dockerfile.api` (target `production`) into the
  local daemon, scan it with Trivy, and only then push to ECR, capturing the
  immutable digest as the job output.
- `build-frontend`: build the web app and upload `dist/` as an artifact.
- `deploy-backend`: needs `quality-gate` and `build-api-image`. Uses **SSM Run
  Command** (not SSH) to pull the repo on EC2 and run `scripts/deploy.sh` with
  the image digest.
- `deploy-frontend`: needs `quality-gate` and `build-frontend`. Syncs assets and
  app shell to S3 with different cache headers, then invalidates CloudFront.

AWS access is via OIDC role assumption — there are no long-lived AWS keys in
GitHub Secrets.

### `.github/workflows/release.yml`

Trigger: push of a `v*` tag.

Runs `scripts/release-notes.sh` over the range since the previous tag and
publishes a GitHub Release with the generated notes. **Tags do not deploy** —
deployment is driven solely by pushes to `master`.

## Docker

Local compose:

- `docker-compose.yml` starts Postgres.

Production compose:

- `docker-compose.prod.yml` runs Postgres plus the API image referenced by
  `${API_IMAGE}`. It never builds from source.

Dockerfiles:

- `docker/Dockerfile.api` — built by CI, scanned, pushed to ECR.
- `docker/Dockerfile.web` — **not referenced by any workflow or compose file.**
  The frontend ships to S3/CloudFront instead. Keep it in sync only if the
  containerized web setup is revived.

`docker/nginx.conf` belongs to that unused containerized web setup.

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
image published to ECR. `.ssh/`, `*.pem`, `*.key`, `.env*`, `.csv/`, `docs/` and
`ai/` are excluded for that reason, not merely to save space. Before adding a
new top-level directory holding anything sensitive, add it to `.dockerignore`.

## Related Docs

- `docs/progress/` — numbered write-ups of each infrastructure milestone.
  Treat the RDS and Redis entries as historical.
- `CONTRIBUTING.md` — commit convention, versioning, and the release process.
