---
title: Upload Source Maps to Sentry, Never Serve Them
impact: HIGH
impactDescription: 7.7 MB of .map files no longer in the nginx image
tags: vite, sourcemap, sentry, build, security
---

## Upload Source Maps to Sentry, Never Serve Them

`build.sourcemap: true` writes `.map` files next to the JS **and** adds a `//# sourceMappingURL` comment, so anything served from `dist/` exposes the full original source and bloats the image. Maps are only needed by the error tracker.

**Incorrect:**

```ts
build: { sourcemap: true } // dist/ (with every .map) is copied into the nginx image
```

**Correct (already in `apps/web/vite.config.ts`):**

```ts
build: {
  // maps only when they will be uploaded (CI has SENTRY_AUTH_TOKEN)
  sourcemap: process.env.SENTRY_AUTH_TOKEN ? "hidden" : false,
},
plugins: [
  sentryVitePlugin({
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
  }),
]
```

- `"hidden"` generates the maps without the `sourceMappingURL` comment, so browsers never ask for them.
- `filesToDeleteAfterUpload` removes them from `dist/` after the Sentry upload, before CI packages the image.
- Check after a build: `find apps/web/dist -name '*.map'` must print nothing.

Reference: [Vite — build.sourcemap](https://vite.dev/config/build-options#build-sourcemap), [Sentry Vite plugin](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/)
