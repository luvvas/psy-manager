---
title: Defer Non-Critical Third-Party Libraries
impact: MEDIUM
impactDescription: loads after first paint
tags: bundle, third-party, analytics, defer
---

## Defer Non-Critical Third-Party Libraries

Widgets, analytics, chat and session-replay scripts don't block user interaction. Load them after the app has painted instead of importing them at the top of `main.tsx`.

**Incorrect (in the entry chunk, parsed before the first render):**

```tsx
// main.tsx
import { initAnalytics } from "some-analytics"
initAnalytics()
```

**Correct (loaded when the browser is idle):**

```tsx
// main.tsx
const load = () => import("some-analytics").then((m) => m.initAnalytics())
if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 5000 })
else setTimeout(load, 2000)
```

**Exception in this project:** Sentry is initialized at the top of `main.tsx` on purpose, so errors during boot are captured. Don't defer it; do keep optional Sentry integrations (e.g. Replay) out unless needed, since each one adds to the entry chunk.
