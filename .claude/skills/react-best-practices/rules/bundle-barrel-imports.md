---
title: Avoid Barrel File Imports
impact: CRITICAL
impactDescription: slower dev server and HMR; risk of pulling unused code
tags: bundle, imports, tree-shaking, barrel-files, vite
---

## Avoid Barrel File Imports

**Barrel files** re-export many modules from one entry (`index.ts` with `export * from './x'`). The cost in Vite is different for libraries and for your own source:

- **Libraries (`lucide-react`, `date-fns`, `radix-ui`):** Vite pre-bundles dependencies once (`optimizeDeps`) and Rolldown tree-shakes them in the production build, so **named imports from the package root are fine**. Never use namespace imports — they defeat tree-shaking.
- **Your own source:** in dev, Vite serves source files unbundled, so importing one symbol from a barrel makes the browser load **every** file the barrel re-exports. Keep barrels small or skip them.

**Incorrect:**

```tsx
import * as Icons from "lucide-react"          // whole icon set in the bundle
<Icons.Calendar />

// src/components/index.ts
export * from "./ui/button"
export * from "./ui/dialog"
export * from "./data-table"                     // importing Button now loads all of them in dev
```

**Correct:**

```tsx
import { Calendar } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button" // import from the file that defines it
```

**Feature barrels in this project:** there are none. `route-modules.ts` imports each page file directly (`import("@/features/pacientes/page-detalhes")`), so a list page and its detail page become separate chunks. A shared barrel put both — and the patient join page with the psychologist call page — in the same chunk.

Reference: [Vite — Avoid Barrel Files](https://vite.dev/guide/performance#avoid-barrel-files)
