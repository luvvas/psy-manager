---
title: Prevent Waterfall Chains in tRPC Procedures
impact: CRITICAL
impactDescription: 2-10× improvement
tags: api, trpc, waterfalls, parallelization
---

## Prevent Waterfall Chains in tRPC Procedures

(Service names below are illustrative.) In a procedure or service (`apps/api`), start independent queries immediately and await them together. Each sequential `await` adds a full database round-trip.

**Incorrect (three sequential round-trips):**

```ts
dashboard: protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.session.user.id
  const upcoming = await appointmentService.upcoming(userId)
  const pending = await financialService.pending(userId)
  const unsigned = await clinicalRecordService.unsigned(userId)
  return { upcoming, pending, unsigned }
})
```

**Correct (one round-trip of latency):**

```ts
dashboard: protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.session.user.id
  const [upcoming, pending, unsigned] = await Promise.all([
    appointmentService.upcoming(userId),
    financialService.pending(userId),
    clinicalRecordService.unsigned(userId),
  ])
  return { upcoming, pending, unsigned }
})
```

**Partial dependency** — start what you can, await late:

```ts
const patientPromise = patientService.getById(userId, input.patientId)
const roomsPromise = clinicService.rooms(userId)
const patient = await patientPromise // ownership check needs it
const [rooms, history] = await Promise.all([roomsPromise, appointmentService.byPatient(userId, patient.id)])
```

Keep writes that must happen in order (CQRS commands, transactions) sequential. Ownership checks still run before any data is returned. See also `async-parallel`, `async-dependencies`.
