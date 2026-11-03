---
title: Lazy-Load Every Route
impact: CRITICAL
impactDescription: initial JS 1,678 KB → 711 KB in this project
tags: bundle, code-splitting, react-router, lazy, vite
---

## Lazy-Load Every Route

In a Vite SPA, a static `import` of a page in the router puts that page — and every library it imports — in the entry chunk that every visitor downloads. Use the router's `lazy` so each page is its own chunk, fetched in parallel with navigation.

This project does it through one explicit map, `apps/web/src/route-modules.ts`, shared by the router and by hover-preloading in the sidebar.

**Incorrect (Recharts, WebRTC, landing and legal pages ship to everyone):**

```tsx
import { FinanceiroPage } from "@/features/financeiro"

export const router = createBrowserRouter([
  { path: "financeiro", element: <FinanceiroPage /> },
])
```

**Correct (React Router 7 data router):**

```ts
// route-modules.ts — literal paths so the bundler can split them
export const pages = {
  financeiro: () => import("@/features/financeiro").then((m) => ({ Component: m.FinanceiroPage })),
}
```

```tsx
// router.tsx
export const router = createBrowserRouter([
  {
    HydrateFallback: PageLoader, // shown while the first route chunk downloads
    children: [{ path: "financeiro", lazy: pages.financeiro }],
  },
])
```

**Adding a new screen:** add an entry to `pages`, use `lazy: pages.x` in `router.tsx`, and if it is in the sidebar, add its path to `preloadByPath`.

**Keep static only** what renders on every first paint: `AppLayout`, the auth guards, tiny pages (`NotFoundPage`, `ComingSoonPage`), and `<Navigate>` redirects.

**Outside the router** (a component rather than a route), use `React.lazy` at module scope, never inside a component. `React.lazy` needs a default export: `lazy(() => import("./x").then((m) => ({ default: m.X })))`.

Pair this with `vite-preload-error`: once routes are chunks, a deploy can delete a chunk that an open tab still references.

Reference: [React Router — lazy](https://reactrouter.com/start/data/route-object#lazy)
