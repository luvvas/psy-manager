# psy-manager — Setup Tasks

## Phase 1: Root Monorepo
- [x] Create project directory `psy-manager`
- [x] Create root `package.json` with Bun workspaces
- [x] Create root `tsconfig.json`
- [x] Create `.gitignore`
- [x] Create `.dockerignore`
- [x] Create `.env` and `.env.example`
- [x] Create `packages/shared` package

## Phase 2: Backend (`apps/api`)
- [x] Create `apps/api/package.json` with dependencies
- [x] Create `apps/api/tsconfig.json`
- [x] Create tRPC init (`src/trpc/index.ts`, `context.ts`, `router.ts`)
- [x] Create Drizzle schema (`src/db/schema.ts`)
- [x] Create Drizzle client (`src/db/index.ts`)
- [x] Create Hono entrypoint with tRPC middleware (`src/index.ts`)
- [x] Create `drizzle.config.ts`

## Phase 3: Frontend (`apps/web`)
- [x] Scaffold Vite + React + TS via `bunx create-vite`
- [x] Install TailwindCSS v4
- [x] Configure `vite.config.ts` with Tailwind plugin + path alias + API proxy
- [x] Configure TypeScript path aliases
- [x] Initialize Shadcn (Radix + Nova preset)
- [x] Create tRPC client (`src/lib/trpc.ts`)
- [x] Wire tRPC provider in `main.tsx`
- [x] Verify Shadcn Button component generated

## Phase 4: Docker
- [x] Create `docker-compose.yml` with PostgreSQL
- [x] Create `docker/Dockerfile.api`
- [x] Create `docker/Dockerfile.web`

## Phase 5: Wire & Verify
- [x] Run `bun install` at root — all workspaces resolved
- [ ] Start PostgreSQL via Docker (requires Docker Desktop running)
- [x] Run `bun run dev` — both web and api start concurrently
- [x] Verify tRPC connectivity (frontend → backend → 200 OK)
- [x] Git init
