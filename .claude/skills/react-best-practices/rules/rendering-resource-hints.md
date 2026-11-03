---
title: Use Resource Hints for Critical and Likely-Next Resources
impact: HIGH
impactDescription: reduces load time for critical resources
tags: rendering, preload, preconnect, prefetch, resource-hints
---

## Use Resource Hints for Critical and Likely-Next Resources

Tell the browser early about resources it will need. In a Vite SPA, static hints known at build time go in `apps/web/index.html`; dynamic ones can use the React DOM APIs from components.

- **`prefetchDNS(href)`**: resolve DNS for a domain you expect to connect to
- **`preconnect(href)`**: open the connection (DNS + TCP + TLS) to a server you'll use soon
- **`preload(href, options)`**: fetch a resource (font, image, stylesheet) needed on this page
- **`preloadModule(href)`** / `import()`: fetch a JS module for a likely next navigation

**Static hints (index.html):**

```html
<!-- third-party origin used right after boot (e.g. Sentry ingest) -->
<link rel="preconnect" href="https://o0.ingest.sentry.io" crossorigin />
```

The API is same-origin (nginx proxies `/trpc` and `/api`), so it needs no preconnect.

**Dynamic hints (component):**

```tsx
import { preload } from "react-dom"

function TabInicio() {
  // landing illustration above the fold: start the download during render
  preload("/images/multitask.svg", { as: "image" })
  ...
}
```

`preconnect` only helps HTTP(S) origins — it does nothing for WebRTC/TURN traffic.

**Route chunks:** Vite already emits `<link rel="modulepreload">` for the entry's static imports. For lazy routes, start the `import()` on hover/focus — see `preloadRoute` in `route-modules.ts` and `bundle-preload`.

| API | Use case |
|-----|----------|
| `prefetchDNS` | Third-party domains you'll connect to later |
| `preconnect` | Origins you'll fetch from soon |
| `preload` | Critical resources for the current page (fonts, LCP image) |
| `import()` on intent | JS for a likely next route or dialog |

Reference: [React DOM Resource Preloading APIs](https://react.dev/reference/react-dom#resource-preloading-apis)
