# Stack And Scripts

## Repository Shape

This is a Bun workspace monorepo.

```text
apps/
  api/
  web/
packages/
  shared/
docker/
ai/
```

## Runtime Stack

- Package manager/runtime: Bun.
- Language: TypeScript.
- API: Hono, `@hono/node-server`, tRPC v11, SuperJSON.
- Auth: Better Auth with Drizzle adapter.
- Database: PostgreSQL via Drizzle ORM and `postgres`.
- Web: React 19, Vite, React Router, TanStack React Query, tRPC React Query.
- UI: Tailwind CSS v4, shadcn/radix-nova config, Radix UI, lucide-react, Sonner.
- Charts: Recharts.
- Forms: react-hook-form and Zod where already used.
- CSV import: PapaParse.
- Storage: local dev storage or S3 presigned URLs.
- Deployment: EC2 for API, RDS Postgres, S3 + CloudFront for frontend, SSM
  Parameter Store for secrets.

## Root Scripts

- `bun run dev`: run web and API together.
- `bun run dev:web`: run only the Vite frontend.
- `bun run dev:api`: run only the API with `tsx watch`.
- `bun run build`: build web and API.
- `bun run build:web`: build frontend.
- `bun run build:api`: build backend.
- `bun run db:generate`: generate Drizzle migrations through the API package.
- `bun run db:migrate`: run Drizzle migrations through the API package.
- `bun run db:push`: push schema changes through the API package.
- `bun run db:studio`: open Drizzle Studio.
- `bun run docker:db`: start only the local Postgres container.
- `bun run docker:up`: start local Docker Compose services.
- `bun run docker:down`: stop local Docker Compose services.

## Package Scripts

API package:

- `bun run --filter @psy-manager/api dev`
- `bun run --filter @psy-manager/api build`
- `bun run --filter @psy-manager/api start`
- `bun run --filter @psy-manager/api db:generate`
- `bun run --filter @psy-manager/api db:migrate`
- `bun run --filter @psy-manager/api db:push`
- `bun run --filter @psy-manager/api db:studio`

Web package:

- `bun run --filter @psy-manager/web dev`
- `bun run --filter @psy-manager/web build`
- `bun run --filter @psy-manager/web lint`
- `bun run --filter @psy-manager/web preview`

Shared package:

- `bun run --filter @psy-manager/shared typecheck`

## Local Ports

- Web dev server: `http://localhost:5173`
- API: `http://localhost:3001`
- tRPC endpoint: `http://localhost:3001/trpc`
- Auth endpoint: `http://localhost:3001/api/auth`
- Local Postgres: `localhost:5432`

## Public Config Shape

Use `.env.example` as the safe source of environment-variable names. Do not paste
values from `.env`.

Important variables:

- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `API_PORT`
- `BETTER_AUTH_URL`
- `STORAGE_DRIVER`
- `LOCAL_STORAGE_DIR`
- `AWS_REGION`
- `AWS_DOCUMENTS_BUCKET`
- `VITE_API_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## Tests

At the time this folder was created, no test runner config or test files were
found. Verification is currently mostly build/lint/manual unless tests are
added for a task.

