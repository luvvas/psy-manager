---
title: In-Process Cache for Hot, Rarely-Changing Reads
impact: HIGH
impactDescription: avoids repeated DB work across requests
tags: api, cache, lru, cross-request
---

## In-Process Cache for Hot, Rarely-Changing Reads

Production runs a single API instance on one VPS, so an in-memory cache is shared by every request without Redis. Use it for data read on almost every request that rarely changes (a psychologist's clinic memberships, work schedule), with a short TTL and explicit invalidation on write.

**Implementation** (`lru-cache` is not an API dependency yet — add it with `bun add lru-cache` in `apps/api`, or use a small `Map` with expiry for a single cache):

```ts
import { LRUCache } from "lru-cache"

const membershipCache = new LRUCache<string, ClinicMembership[]>({ max: 1000, ttl: 60_000 })

export async function getMemberships(psychologistId: string) {
  const cached = membershipCache.get(psychologistId)
  if (cached) return cached
  const rows = await db.query.psychologistClinic.findMany({ where: eq(psychologistClinic.psychologistId, psychologistId) })
  membershipCache.set(psychologistId, rows)
  return rows
}

export function invalidateMemberships(psychologistId: string) {
  membershipCache.delete(psychologistId)
}
```

- **Key by owner** (`psychologistId`), never a global key — one user must never read another's cached value.
- **Invalidate on every write path** that changes the data, including clinic invites and leaving a clinic.
- Never cache decrypted patient PII.
- The cache resets on restart and is not shared if the API ever runs more than one instance — treat it as an optimization, never as the source of truth.
- Measure first: don't add a cache to a query that isn't hot.

Reference: [lru-cache](https://github.com/isaacs/node-lru-cache)
