---
title: Hashed Assets Immutable, index.html Never Cached
impact: CRITICAL
impactDescription: users always get the latest deploy; repeat visits load from cache
tags: vite, nginx, cloudflare, caching, spa-fallback
---

## Hashed Assets Immutable, index.html Never Cached

Vite names build assets with a content hash (`index-D7ZuTxZ3.js`), so they can be cached forever. `index.html` is the only file that points at the current hashes, so it must always be revalidated. Unknown paths must return `index.html` with status 200 so deep links work.

**Already correct in `docker/nginx.conf` — don't regress it:**

```nginx
location /assets/ {
    try_files $uri =404;  # a missing chunk is a real 404, not index.html
    add_header Cache-Control "public, max-age=31536000, immutable" always;
}

location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}
```

**Incorrect changes to avoid:**

- Caching `index.html` (in nginx or with a Cloudflare cache rule) → users keep old hashes after a deploy.
- Falling back to `index.html` for `/assets/*` → a missing chunk returns HTML with status 200 and fails with a confusing MIME error instead of `vite:preloadError`.
- `immutable` on files in `public/` (`favicon.svg`, `images/`, `screenshots/`): they are served **without** a hash, so a long cache would pin old versions.

`/api`, `/trpc` and `/ws` are proxied to the API and bypass the Cloudflare cache.

Reference: [Vite — Deploying a Static Site](https://vite.dev/guide/static-deploy)
