---
title: Import Assets; Use public/ Only for Fixed Names
impact: MEDIUM
impactDescription: hashed, long-cached assets; no stale files
tags: vite, assets, images, fonts, public
---

## Import Assets; Use public/ Only for Fixed Names

Assets imported from code are hashed and served from `/assets/` with a one-year immutable cache. Files in `public/` keep their name, are not hashed, and must be referenced by absolute path.

**Incorrect:**

```tsx
import logo from "../../public/logo.svg"     // never import from public/
<img src="/images/logo-2.svg" />             // changing it later serves stale copies
```

**Correct:**

```tsx
import logo from "@/assets/logo.svg"         // hashed URL
import logoSvg from "@/assets/logo.svg?raw"  // file contents as a string
<img src={logo} width={120} height={32} alt="psy-manager" />
```

- `public/` is for files that need a fixed URL: `favicon.svg`, `robots.txt`, images linked from outside the app.
- Icons come from `lucide-react`; don't add icon images.
- Fonts: `@fontsource-variable/geist` is self-hosted. Don't switch to Google Fonts (CSP and privacy); a new font should be variable and latin-subset.
- Images: explicit `width`/`height` (no layout shift); `loading="lazy" decoding="async"` below the fold; above-the-fold images eager with `fetchPriority="high"`; prefer SVG/AVIF/WebP.

Reference: [Vite — Static Asset Handling](https://vite.dev/guide/assets)
