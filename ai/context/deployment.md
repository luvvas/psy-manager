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

Based on the existing docs and workflow files, production is moving toward:

- API on AWS EC2, deployed with Docker Compose.
- PostgreSQL on AWS RDS.
- Frontend static build on S3.
- CloudFront in front of the frontend.
- AWS SSM Parameter Store for secrets.
- S3 bucket for private document storage through presigned URLs.

## GitHub Actions

Workflow file:

- `.github/workflows/deploy-ec2.yml`

Trigger:

- Push to `master`.

Jobs:

- `deploy-backend`: SSH into EC2, fetch latest `master`, load secrets from SSM,
  run Docker Compose, and run database migrations in the API container.
- `deploy-frontend`: install Bun, build the web app, sync immutable assets and
  app shell to S3, and invalidate CloudFront.

## Docker

Local compose:

- `docker-compose.yml` starts Postgres.

Production compose:

- `docker-compose.prod.yml` defines the API container and environment variables.

Dockerfiles:

- `docker/Dockerfile.api`
- `docker/Dockerfile.web`

There is also `docker/nginx.conf` for serving the web build and proxying `/trpc`
and `/api` in the containerized web setup.

## Existing Deployment Docs

- `step-by-step.md`: long deployment guide covering EC2, Docker, RDS, S3,
  CloudFront, SSM, IAM, presigned uploads, cache invalidation, and AWS study
  notes.
- `next-step.md`: completed infrastructure roadmap and note about robust Google
  Drive sync architecture.

