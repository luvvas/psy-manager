---
title: Recover When a Deploy Deletes a Lazy Chunk
impact: HIGH
impactDescription: prevents a blank screen for users with an open tab during deploys
tags: vite, code-splitting, deploy, preloadError
---

## Recover When a Deploy Deletes a Lazy Chunk

With lazy routes, a tab opened before a deploy still holds the old `index.html`, which references chunk hashes that no longer exist on the server. The next navigation fails to load the chunk. Vite emits `vite:preloadError` for this; reload once to pick up the new `index.html`.

**Incorrect (no handler — the route throws and the user sees the error boundary):**

```tsx
// main.tsx — nothing listens for vite:preloadError
```

**Correct (already in `apps/web/src/main.tsx`):**

```ts
const LAST_RELOAD_KEY = "psy:chunk-reload-at"
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem(LAST_RELOAD_KEY) ?? 0)
    if (Date.now() - last < 60_000) return // still failing: let the error boundary show
    sessionStorage.setItem(LAST_RELOAD_KEY, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})
```

The time window prevents a reload loop when the failure is not a deploy (offline, server down). It works together with `vite-caching-and-fallback`: `index.html` is served with `no-cache`, so the reload always gets the new hashes.

Reference: [Vite — Load Error Handling](https://vite.dev/guide/build#load-error-handling)
