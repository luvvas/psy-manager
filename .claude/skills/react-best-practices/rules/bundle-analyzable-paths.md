---
title: Prefer Statically Analyzable Import Paths
impact: HIGH
impactDescription: avoids accidental broad bundles
tags: bundle, vite, rolldown, dynamic-import, path
---

## Prefer Statically Analyzable Import Paths

The bundler only splits what it can see at build time. If the real path of an `import()` is hidden in a variable, Vite either warns and cannot analyze it, or (with a partially dynamic template) includes every file that could match.

Use explicit maps of import functions so the set of reachable files stays narrow and predictable.

**Incorrect (the bundler cannot tell what may be imported):**

```ts
const VIEWS = { diario: "./daily-view", semanal: "./weekly-view" } as const
const View = await import(VIEWS[view])
```

**Correct (explicit map of allowed modules):**

```ts
const VIEWS = {
  diario: () => import("./daily-view"),
  semanal: () => import("./weekly-view"),
} as const
const View = await VIEWS[view]()
```

`apps/web/src/route-modules.ts` follows this pattern for every route.

Reference: [Vite — Dynamic Import](https://vite.dev/guide/features#dynamic-import)
