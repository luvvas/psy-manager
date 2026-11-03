---
title: No Request Data in Module-Level Variables
impact: HIGH
impactDescription: prevents cross-user data leaks
tags: api, concurrency, security, state
---

## No Request Data in Module-Level Variables

The API process serves many requests concurrently. A mutable module-level variable is shared by all of them: if request A writes the current user and request B overwrites it before A finishes, A returns B's data — a tenant-isolation bug in a clinical app.

**Incorrect:**

```ts
let currentPsychologistId: string | null = null

export const patientRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    currentPsychologistId = ctx.session.user.id
    return listPatients() // reads currentPsychologistId after an await — may be another user's
  }),
})
```

**Correct (pass request data explicitly):**

```ts
export const patientRouter = router({
  list: protectedProcedure.query(({ ctx }) => patientService.list(ctx.session.user.id)),
})
```

Safe at module level: immutable config, the DB client, process-wide caches keyed by an explicit owner (`api-lru-cache`). The in-memory rate limiter and WebSocket rooms are deliberately process-wide.
