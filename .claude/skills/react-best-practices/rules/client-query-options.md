---
title: Use the Right Loading Flags and Query Options
impact: MEDIUM
impactDescription: no flashing tables, fewer refetches
tags: client, tanstack-query, loading, pagination, staleTime
---

## Use the Right Loading Flags and Query Options

**`isPending` vs `isFetching`:** `isPending` means there is no data yet (show a skeleton). `isFetching` is also true during background refetches — never swap a populated table for a skeleton because of it.

**Incorrect (table blinks to skeleton on every refetch and filter change):**

```tsx
const { data, isFetching } = trpc.patient.list.useQuery({ search })
if (isFetching) return <TableSkeleton />
```

**Correct:**

```tsx
const { data, isPending, isFetching } = trpc.patient.list.useQuery(
  { search },
  { placeholderData: (prev) => prev }, // keep previous rows while the new filter loads
)
if (isPending) return <TableSkeleton />
return <DataTable data={data} className={isFetching ? "opacity-60" : undefined} />
```

**Stable inputs:** the input object is part of the query key. Build it from primitives; a `new Date()` created on every render is a new key every render.

```tsx
// Incorrect: new key every render → refetch loop
trpc.appointment.list.useQuery({ from: new Date() })
// Correct
const from = useMemo(() => startOfDay(selectedDate).toISOString(), [selectedDate])
trpc.appointment.list.useQuery({ from })
```

**`staleTime`:** the default is 0 (refetch on every mount and window focus). Raise it for data that rarely changes.

Reference: [TanStack Query — Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
