---
title: Invalidate Every Affected Query After a Mutation
impact: MEDIUM-HIGH
impactDescription: prevents stale lists, KPIs and counters
tags: client, mutation, invalidation, trpc, tanstack-query
---

## Invalidate Every Affected Query After a Mutation

After a write, every query whose result may have changed must be invalidated — not just the list on screen. Missed invalidations show up as KPI cards, badges or another tab still showing the old value.

**Incorrect (list updates, the stats cards and the home dashboard don't):**

```tsx
const create = trpc.financial.create.useMutation({
  onSuccess: () => utils.financial.list.invalidate(),
})
```

**Correct:**

```tsx
const utils = trpc.useUtils()
const create = trpc.financial.create.useMutation({
  onSuccess: () => {
    utils.financial.invalidate() // every query under the router: list, stats, charts
    toast.success("Lançamento salvo")
  },
  onError: (err) => toast.error(err.message),
})
```

- `utils.<router>.invalidate()` invalidates the whole router; `utils.<router>.<proc>.invalidate()` just one procedure.
- Writes with side effects in other modules (an appointment that creates a financial entry) must invalidate those routers too.
- Don't edit the cache by hand (`setData`) unless doing a deliberate optimistic update with rollback in `onError`.
- Prefer `mutate` + callbacks in UI handlers; use `mutateAsync` only when you need to `await` (and then handle the rejection).
