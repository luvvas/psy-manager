---
title: Measure the Bundle Before and After
impact: MEDIUM
impactDescription: turns guesses into numbers
tags: vite, bundle, analysis, visualizer
---

## Measure the Bundle Before and After

Every bundle change should show its effect. `vite build` prints every chunk with raw and gzip size; compare the entry chunk (`index-*.js`) before and after.

```bash
bun run build:web   # read the table; the entry chunk is index-*.js
```

**Reference numbers for this project (Nov 2026):** entry chunk 1,678 KB → 711 KB (226 KB gzip) after lazy routes and lazy sidebar forms. Remaining entry is mostly framework: react-dom, react-router, Sentry, TanStack Query, tRPC. The largest lazy chunk is `financeiro` (~388 KB, Recharts).

**What is inside a chunk** — build once with source maps to a scratch directory and sum sources per package:

```bash
bunx vite build --sourcemap --outDir /tmp/dist-analyze --emptyOutDir
# then group map.sources by node_modules/<pkg> and sum sourcesContent lengths
```

Or a treemap with `rollup-plugin-visualizer` (`template: "treemap", gzipSize: true`), enabled only through an env var (`ANALYZE=1`). Don't leave it on in the normal build or commit `stats.html`.

A new dependency that shows up in the entry chunk needs a reason. If only one screen uses it, it belongs in that screen's chunk.
