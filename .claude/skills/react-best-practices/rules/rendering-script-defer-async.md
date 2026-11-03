---
title: Use defer or async on Script Tags in index.html
impact: HIGH
impactDescription: eliminates render-blocking
tags: rendering, script, defer, async, index-html
---

## Use defer or async on Script Tags in index.html

Classic `<script>` tags without `defer` or `async` block HTML parsing while they download and execute, delaying the first paint. Vite's own entry (`<script type="module">`) is deferred by default; third-party scripts you add to `apps/web/index.html` are not.

- **`defer`**: downloads in parallel, runs after parsing, keeps order — for scripts that need the DOM or each other
- **`async`**: downloads in parallel, runs as soon as ready, no order — for independent scripts like analytics

**Incorrect (blocks rendering):**

```html
<head>
  <script src="https://example.com/analytics.js"></script>
  <script src="/scripts/widget.js"></script>
</head>
```

**Correct (non-blocking):**

```html
<head>
  <script src="https://example.com/analytics.js" async></script>
  <script src="/scripts/widget.js" defer></script>
</head>
```

Better still, load optional third parties from code after first paint (`bundle-defer-third-party`). Any new external origin must also be allowed in the Content-Security-Policy in `docker/nginx.conf`.

Reference: [MDN — script element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#defer)
