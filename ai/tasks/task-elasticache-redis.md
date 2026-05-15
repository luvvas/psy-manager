# Task: ElastiCache Redis — Cache de Pacientes + Store de Sessão

Status: draft

## Goal

Add a Redis layer with two responsibilities:

1. **Patient list cache (lazy loading):** avoid hitting RDS on every page that
   lists patients. Cache TTL of 60 seconds per psychologist; invalidated on any
   patient write command.
2. **Shared session store:** move Better Auth session storage from PostgreSQL to
   Redis so that all EC2 instances behind the ALB (service 4) read from the same
   store. This is a hard prerequisite for `task-alb-auto-scaling`.

## Context

Relevant files:

- `apps/api/src/index.ts` — Better Auth initialization; session adapter configured here
- `apps/api/src/trpc/context.ts` — session is resolved per request
- `apps/api/src/routes/patient.ts` — patient list query (add cache here)
- `apps/api/src/cqrs/patient/` — patient write commands (invalidate cache here)
- `apps/api/src/db/index.ts` — DB connection pattern
- `docker-compose.prod.yml` — add Redis service for local-to-prod parity
- `.github/workflows/deploy-ec2.yml` — pass `REDIS_URL` to the container

Existing behavior:

- The patient list query calls the RDS PostgreSQL database on every request.
- Better Auth stores sessions in the `session` table in PostgreSQL.
- There is no Redis instance anywhere in the stack today.

## Requirements

### Infrastructure

- Provision an ElastiCache Redis cluster in AWS:
  - Node type: `cache.t3.micro` (Free Tier eligible for 12 months).
  - Single-node, no Multi-AZ (cost control).
  - Place in the same VPC as the EC2 instance.
  - Security group: allow TCP 6379 from the EC2 security group only.
- Store the Redis endpoint in SSM Parameter Store:
  - `/psy-manager/prod/REDIS_URL` → `redis://<endpoint>:6379`

### Docker (local and production)

Add a `redis` service to `docker-compose.prod.yml`:

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  ports:
    - "6379:6379"
```

Add `REDIS_URL=redis://redis:6379` to the `api` service environment.

For local development, add to `.env.example`:

```env
REDIS_URL=redis://localhost:6379
```

### API — Session Store

- Install `@upstash/redis` or `ioredis`.
- Configure Better Auth to use Redis as the session adapter. Check the Better Auth
  docs for the `secondaryStorage` or custom session adapter option.
- Sessions written on instance A must be readable on instance B.

### API — Patient List Cache

Create `apps/api/src/lib/cache.ts`:

- `getRedisClient()` — singleton `ioredis` client using `REDIS_URL`.
- `getCachedPatients(psychologistId)` — returns parsed array or `null`.
- `setCachedPatients(psychologistId, patients)` — stores JSON with TTL 60 s.
- `invalidatePatientCache(psychologistId)` — deletes the key.

In `apps/api/src/routes/patient.ts` (or the relevant query service):

- On list query: check cache → hit returns early; miss fetches RDS and populates
  cache.

In `apps/api/src/cqrs/patient/` command handlers:

- After any successful patient write, call `invalidatePatientCache(psychologistId)`.

### GitHub Actions

Add to the deploy step that fetches SSM parameters:

```bash
export REDIS_URL=$(aws ssm get-parameter \
  --region sa-east-1 \
  --name "/psy-manager/prod/REDIS_URL" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text)
```

Add `REDIS_URL: ${REDIS_URL}` to the `api` service in `docker-compose.prod.yml`.

## Constraints

- Keep user-facing text in pt-BR.
- Redis must not be publicly accessible — VPC-only.
- Do not cache mutable or sensitive data beyond patient lists (no clinical records,
  no financial transactions).
- Graceful degradation: if Redis is unreachable, the API must still serve requests
  from RDS (log the error, do not throw).
- Do not touch unrelated modules.

## Acceptance Criteria

- Patient list endpoint returns data without querying RDS on a cache hit (verify
  via CloudWatch RDS connection metrics or query logs).
- A patient write (create/update/delete) invalidates the cache; the next list
  request reflects the change.
- Authenticated requests work correctly when routed through two simulated instances
  (e.g. run two API processes locally and verify a session created on port 3001 is
  valid on port 3002).
- `bun run build` passes with no type errors.

## Suggested Verification

```bash
bun run build
# start redis locally: docker compose up redis
# start api, create a patient, list patients twice → second call must be a cache hit
# update the patient → list again → must reflect the change
# test session: login on port 3001, make an authenticated request on port 3002
```
