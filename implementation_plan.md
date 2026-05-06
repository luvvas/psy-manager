# psy-manager — Full-Stack Environment Setup

Setting up a **Bun monorepo** with end-to-end type safety via **tRPC**, connecting a **Vite + React** frontend to a **Hono** backend, with **PostgreSQL** via **Docker** and **Drizzle ORM**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Package Manager | Bun 1.2.14 |
| Bundler | Vite |
| Frontend | React + TypeScript |
| Backend | Hono + Node.js |
| API Layer | tRPC (end-to-end type safety) |
| UI | TailwindCSS v4 + Shadcn |
| Database | PostgreSQL 17 |
| ORM | Drizzle |
| Containerization | Docker Compose |

## Project Structure

```
psy-manager/
├── apps/
│   ├── web/                        # Frontend (Vite + React + TS)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── ui/             # Shadcn components
│   │   │   ├── lib/
│   │   │   │   ├── utils.ts        # cn() utility
│   │   │   │   └── trpc.ts         # tRPC React client
│   │   │   ├── App.tsx
│   │   │   ├── index.css
│   │   │   └── main.tsx
│   │   ├── components.json         # Shadcn config
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.app.json
│   │   └── vite.config.ts
│   │
│   └── api/                        # Backend (Hono + tRPC)
│       ├── src/
│       │   ├── db/
│       │   │   ├── index.ts        # Drizzle client
│       │   │   └── schema.ts       # Drizzle schema
│       │   ├── trpc/
│       │   │   ├── index.ts        # tRPC init (router, procedure)
│       │   │   ├── context.ts      # tRPC context
│       │   │   └── router.ts       # Root app router
│       │   ├── routes/
│       │   │   └── health.ts       # tRPC health procedure
│       │   └── index.ts            # Hono app + tRPC middleware
│       ├── drizzle/                # Generated migrations
│       ├── drizzle.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                     # Shared types/utilities
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.web
│
├── .env
├── .env.example
├── .gitignore
├── .dockerignore
├── docker-compose.yml
├── package.json                    # Root workspace
└── tsconfig.json                   # Root TS config
```

## How Everything Ties Together

```
┌─────────────────────────────────────────────────────────────┐
│                     Bun Monorepo                            │
│                                                             │
│  ┌──────────────┐    tRPC (type-safe)    ┌──────────────┐  │
│  │   apps/web   │ ◄────────────────────► │   apps/api   │  │
│  │  Vite+React  │   AppRouter type       │  Hono+tRPC   │  │
│  │  Shadcn UI   │   shared across        │  Drizzle ORM │  │
│  │  TailwindV4  │   workspaces           │              │  │
│  └──────────────┘                        └──────┬───────┘  │
│         │                                       │          │
│         │  imports @psy-manager/shared           │ Drizzle  │
│         ▼                                       ▼          │
│  ┌──────────────┐                        ┌──────────────┐  │
│  │   packages/  │                        │  PostgreSQL   │  │
│  │   shared     │                        │  (Docker)     │  │
│  └──────────────┘                        └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Execution Phases

### Phase 1: Root monorepo + shared package
### Phase 2: Backend (Hono + tRPC + Drizzle)
### Phase 3: Frontend (Vite + React + TailwindCSS v4 + Shadcn + tRPC client)
### Phase 4: Docker (PostgreSQL + Dockerfiles)
### Phase 5: Wire everything, install, verify
