---
title: Fetch Through tRPC + TanStack Query, Never useEffect
impact: MEDIUM-HIGH
impactDescription: automatic deduplication, caching and batching
tags: client, trpc, tanstack-query, deduplication, data-fetching
---

## Fetch Through tRPC + TanStack Query, Never useEffect

`trpc.<router>.<procedure>.useQuery` gives request deduplication, caching, background revalidation and typed results. Components using the same procedure and input share one cache entry, and `httpBatchLink` (in `main.tsx`) merges queries fired in the same tick into one HTTP request.

**Incorrect (no cache, no dedup, race conditions, manual loading state):**

```tsx
function PatientList() {
  const [patients, setPatients] = useState([])
  useEffect(() => {
    fetch("/trpc/patient.list").then((r) => r.json()).then(setPatients)
  }, [])
}
```

**Correct (every instance shares one request):**

```tsx
function PatientList() {
  const { data: patients = [], isPending } = trpc.patient.list.useQuery()
}
```

**For data that rarely changes** (clinic rooms, work schedule, settings):

```tsx
const { data: clinics } = trpc.clinic.list.useQuery(undefined, { staleTime: 5 * 60_000 })
```

**For mutations:**

```tsx
const utils = trpc.useUtils()
const create = trpc.patient.create.useMutation({
  onSuccess: () => utils.patient.list.invalidate(),
})
<Button onClick={() => create.mutate(values)} disabled={create.isPending}>Salvar</Button>
```

Don't pass query `data` down three levels of props to "save a request" — calling the same `useQuery` in the child reads from the cache.

Reference: [TanStack Query](https://tanstack.com/query/latest), [tRPC React Query](https://trpc.io/docs/client/react)
