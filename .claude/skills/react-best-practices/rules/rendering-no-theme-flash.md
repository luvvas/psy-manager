---
title: Apply Stored Preferences Before React Mounts
impact: MEDIUM
impactDescription: avoids a visible flash of the default theme
tags: rendering, theme, localStorage, flicker, index-html
---

## Apply Stored Preferences Before React Mounts

Anything visual that depends on client storage (theme, color scheme, sidebar width) and is applied in a `useEffect` paints the default first, then switches — a visible flash. In an SPA there is no hydration to worry about: apply the value in a tiny synchronous script in `index.html`, before the bundle runs.

**Incorrect (default colors paint first, then switch):**

```tsx
function ThemeWrapper({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState("light")
  useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored) setTheme(stored)
  }, [])
  return <div className={theme}>{children}</div>
}
```

**Correct (index.html, runs before first paint):**

```html
<head>
  <script>
    try {
      var t = localStorage.getItem("theme:v1")
      if (t === "dark") document.documentElement.classList.add("dark")
    } catch (e) {}
  </script>
</head>
```

React then reads the same storage in `useState(() => ...)` to initialize, so there is no mismatch.

**In this project:** the custom palette (`lib/theme.ts`, `applyTheme`) comes from `psychologist.me`, i.e. from the API, so it can only be applied after that query resolves. If it flashes, cache the last applied `ThemeConfig` in `localStorage` and apply it from the inline script. The CSP in `docker/nginx.conf` must allow the inline script by **hash** (`'sha256-...'`), never `'unsafe-inline'`.
