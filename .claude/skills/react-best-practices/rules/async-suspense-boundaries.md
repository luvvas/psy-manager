---
title: Strategic Suspense Boundaries
impact: HIGH
impactDescription: faster first paint of the page shell
tags: async, suspense, useSuspenseQuery, layout-shift
---

## Strategic Suspense Boundaries

Don't block a whole page on data that only one section needs. Either give each section its own loading state, or use `useSuspenseQuery` with a `<Suspense>` boundary around **only** the data-dependent subtree, so the header, filters and the other sections paint immediately.

**Incorrect (the whole page waits for the chart data):**

```tsx
function FinanceiroPage() {
  const { data, isPending } = trpc.financial.list.useQuery()
  if (isPending) return <FullPageSpinner />
  return (
    <>
      <AppHeader title="Financeiro" />
      <Filters />
      <IncomeChart data={data} />
      <TransactionsTable data={data} />
    </>
  )
}
```

**Correct (shell renders immediately, sections suspend independently):**

```tsx
function FinanceiroPage() {
  return (
    <>
      <AppHeader title="Financeiro" />
      <Filters />
      <Suspense fallback={<ChartSkeleton />}>
        <IncomeChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <TransactionsTable />
      </Suspense>
    </>
  )
}

function IncomeChart() {
  const [data] = trpc.financial.list.useSuspenseQuery() // same cache entry as the table
  return <Chart data={data} />
}
```

Both sections read the same query, so only one request is made.

**Errors:** a suspending component throws its error to the nearest error boundary. Wrap sections with `QueryErrorResetBoundary` + an error boundary that offers "Tentar novamente", instead of letting it reach the app-level `Sentry.ErrorBoundary`.

**When NOT to use this pattern:**

- Data that decides the layout (would cause a jump from skeleton to content)
- Small, fast queries where a skeleton flash is worse than waiting
- Existing screens that use `useQuery` + `isPending` consistently — follow the local pattern

**Trade-off:** faster first paint vs. potential layout shift. Size skeletons to the real content.

Reference: [TanStack Query — Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
