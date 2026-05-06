# psy-manager — Environment Setup Walkthrough

## What Was Built

A **Bun monorepo** with full-stack end-to-end type safety, connecting a React frontend to a Hono backend via tRPC.

## Verified Working

![Full-stack verification: React frontend calling Hono API via tRPC and receiving a 200 OK health response](C:\Users\Lucas\.gemini\antigravity\brain\f5e8444d-01ef-4a98-8076-3d7793725594\fullstack_verified.png)

## Tech Stack Summary

| Layer | Technology | Status |
|-------|-----------|--------|
| Package Manager | Bun 1.2.14 | ✅ |
| Monorepo | Bun Workspaces | ✅ |
| Bundler | Vite 8.x | ✅ |
| Frontend | React 19 + TypeScript | ✅ |
| API Layer | tRPC v11 (`@trpc/react-query`) | ✅ |
| Backend | Hono 4.x + `@hono/node-server` | ✅ |
| UI Framework | TailwindCSS v4 + Shadcn (Radix Nova) | ✅ |
| Database | PostgreSQL 17 (Docker) | ✅ (config ready) |
| ORM | Drizzle + drizzle-kit | ✅ |
| Containerization | Docker Compose | ✅ |

## Project Structure

```
psy-manager/
├── apps/
│   ├── web/                    # React + Vite + TailwindCSS + Shadcn
│   │   ├── src/
│   │   │   ├── components/ui/  # Shadcn components (Button included)
│   │   │   ├── lib/
│   │   │   │   ├── trpc.ts     # tRPC React client (createTRPCReact)
│   │   │   │   └── utils.ts    # cn() utility
│   │   │   ├── App.tsx         # Main app with tRPC health check
│   │   │   ├── main.tsx        # tRPC + React Query providers
│   │   │   └── index.css       # Tailwind + Shadcn theme
│   │   ├── vite.config.ts      # Tailwind plugin + /trpc proxy
│   │   └── components.json     # Shadcn config
│   │
│   └── api/                    # Hono + tRPC + Drizzle
│       ├── src/
│       │   ├── db/
│       │   │   ├── index.ts    # Drizzle client (postgres.js)
│       │   │   └── schema.ts   # Users table schema
│       │   ├── trpc/
│       │   │   ├── index.ts    # tRPC init + SuperJSON
│       │   │   ├── context.ts  # DB context
│       │   │   └── router.ts   # AppRouter (health + user CRUD)
│       │   └── index.ts        # Hono app + CORS + tRPC middleware
│       └── drizzle.config.ts
│
├── packages/shared/            # Shared types (ApiResponse, User)
├── docker/                     # Dockerfiles (API + Web)
├── docker-compose.yml          # PostgreSQL 17
└── .env                        # Database + API config
```

## Key Design Decisions

### tRPC Integration
- **`@hono/trpc-server`** middleware mounts tRPC at `/trpc/*` on the Hono server
- **`@trpc/react-query`** provides `createTRPCReact` with `trpc.Provider` and hooks like `trpc.health.useQuery()`
- **SuperJSON** transformer on both ends for proper `Date` serialization
- **Vite proxy** routes `/trpc` requests to `http://localhost:3001` in dev (avoids CORS)

### Monorepo Wiring
- `@psy-manager/shared` is consumed by both `web` and `api` via `workspace:*`
- `AppRouter` type is imported from `apps/api/src/trpc/router.ts` into the frontend — **only the type**, no runtime code leaks

---

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start both web (5173) and api (3001) concurrently |
| `bun run dev:web` | Start only the frontend |
| `bun run dev:api` | Start only the backend |
| `bun run build` | Build both apps |
| `bun run docker:db` | Start PostgreSQL container |
| `bun run docker:up` | Start all Docker services |
| `bun run docker:down` | Stop all Docker services |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply Drizzle migrations |
| `bun run db:push` | Push schema directly (no migration) |
| `bun run db:studio` | Open Drizzle Studio GUI |
| `bunx shadcn@latest add <component>` | Add Shadcn components (run in `apps/web/`) |

## Next Steps

1. **Start Docker Desktop** → run `bun run docker:db` to start PostgreSQL
2. **Run migrations** → `bun run db:generate` then `bun run db:migrate`
3. **Add Shadcn components** → `cd apps/web && bunx shadcn@latest add <component>`
4. **Build features** — the tRPC router in `apps/api/src/trpc/router.ts` already has example `user.list` and `user.create` procedures
