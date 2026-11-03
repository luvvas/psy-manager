---
title: vite build Does Not Type-Check
impact: HIGH
impactDescription: catches type and case-sensitivity errors before CI
tags: vite, build, typescript, ci
---

## vite build Does Not Type-Check

Vite only transpiles TypeScript; type errors pass straight through `vite build`. The web `build` script runs `tsc -b && vite build`, so always build through it.

**Incorrect:**

```bash
npx vite build        # green even with type errors
```

**Correct:**

```bash
bun run build:web                              # tsc -b && vite build
bun run --filter @psy-manager/web lint
bun run test:web
```

**For routing changes**, also run `bunx vite preview` (in `apps/web`) and open a deep link directly (e.g. `/pacientes/<id>`) and a lazy route, then navigate between screens.

**Case sensitivity:** CI and the VPS run Linux. `import { X } from "./Form"` resolves on a case-insensitive file system but fails in CI if the file is `form.tsx`. Match the file name exactly.
