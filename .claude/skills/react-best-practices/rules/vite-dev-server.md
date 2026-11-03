---
title: Keep the Dev Server Fast
impact: LOW-MEDIUM
impactDescription: faster cold start and page loads in dev
tags: vite, dev-server, optimizeDeps, warmup, proxy
---

## Keep the Dev Server Fast

Vite serves source files on demand in dev, so the import graph shape matters more than in the build.

- **Avoid source barrels** (`bundle-barrel-imports`): one import from a barrel loads every re-exported file.
- **Late-discovered dependencies:** if opening a screen for the first time triggers "new dependencies optimized, reloading", add the package to `optimizeDeps.include`. Strange stale-module behavior: `bunx vite --force`.
- **Warm up hot files:**

```ts
// vite.config.ts
server: {
  warmup: { clientFiles: ["./src/main.tsx", "./src/router.tsx", "./src/route-modules.ts"] },
},
```

- **Proxy:** `/trpc` and `/api/auth` are proxied to `localhost:3001`. A new API path outside these prefixes must be added here **and** in `docker/nginx.conf`, or it will work in neither dev nor prod.
- Don't add plugins for convenience: each plugin runs on every module. Audit with `bunx vite --debug plugin-transform`.

Reference: [Vite — Performance](https://vite.dev/guide/performance)
