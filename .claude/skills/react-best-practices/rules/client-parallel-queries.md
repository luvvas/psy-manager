---
title: Start Independent Queries in the Same Render
impact: CRITICAL
impactDescription: removes client-side request waterfalls
tags: client, waterfalls, trpc, tanstack-query, parallel
---

## Start Independent Queries in the Same Render

The SPA version of a waterfall: a parent shows a skeleton until its query resolves, and only then mounts a child that starts its own query. Two round-trips where one would do. Call independent queries in the same component (or make sure the child mounts immediately) so they start together — `httpBatchLink` then sends them in a single request.

**Incorrect (patients only start loading after appointments arrive):**

```tsx
function Page() {
  const appointments = trpc.appointment.list.useQuery()
  if (appointments.isPending) return <Skeleton />
  return <AppointmentForm /> // calls trpc.patient.list.useQuery() only now
}
```

**Correct (both start together; the child reads from the cache):**

```tsx
function Page() {
  const appointments = trpc.appointment.list.useQuery()
  const patients = trpc.patient.list.useQuery()
  if (appointments.isPending) return <Skeleton />
  return <AppointmentForm />
}
```

**Real dependency** (B needs an id from A): use `enabled`, and question whether the API should return both in one procedure.

```tsx
const patient = trpc.patient.getById.useQuery({ id })
const records = trpc.clinicalRecord.list.useQuery(
  { patientId: patient.data?.id ?? "" },
  { enabled: !!patient.data },
)
```

Don't gate a whole page on one query when only a section needs it — render the shell and give each section its own loading state.
