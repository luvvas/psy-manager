---
title: Write Vite 8 Config, Not Vite 5 Snippets
impact: MEDIUM
impactDescription: avoids silently ignored or broken options
tags: vite, config, rolldown, oxc, migration
---

## Write Vite 8 Config, Not Vite 5 Snippets

This project runs Vite 8 (Rolldown bundler, Oxc transforms). Many tutorials and AI-generated snippets target Vite ≤7 and use options that were renamed or removed.

**Incorrect (Vite ≤7 options):**

```ts
build: {
  rollupOptions: {
    output: { manualChunks: { vendor: ["react", "react-dom"] } }, // object form removed
  },
  target: "es2015",          // needlessly old; bigger, slower output
},
esbuild: { drop: ["console"] }, // esbuild is no longer the default transformer
```

**Correct:**

- Bundler options live in `build.rolldownOptions`. Manual chunking uses Rolldown's `codeSplitting.groups` — this project already has `vendor-react` and `vendor-data` groups in `apps/web/vite.config.ts`. Only list libraries that the entry chunk already uses: a group captures every matching module regardless of who imports it, so a broad `/node_modules/` group would pull lazy-only libraries (Recharts, PapaParse) into the initial download. Measure the initial JS (entry + modulepreloads in `dist/index.html`) before and after.
- Leave `build.target` at the default (baseline widely-available browsers). Add `@vitejs/plugin-legacy` only for a real old-browser requirement.
- Check option names against the current docs before adding them.
- Don't import from `some-pkg/dist/...`; use the package's public `exports`. A CommonJS package's default import may come through as an object — prefer named imports.
- The only alias is `@` → `src` (mirrored in `tsconfig`); don't add others without need.

Reference: [Vite — Migration from v7](https://vite.dev/guide/migration), [Rolldown — codeSplitting](https://rolldown.rs/reference/OutputOptions.codeSplitting)
