---
title: Dynamic Imports for Heavy Components
impact: CRITICAL
impactDescription: directly affects TTI and LCP
tags: bundle, dynamic-import, code-splitting, react-lazy, suspense
---

## Dynamic Imports for Heavy Components

Use `React.lazy` + `Suspense` for large components that are not needed on the first render: dialogs and sheets that are closed most of the time, charts, editors, PDF viewers. Radix `Dialog`/`Sheet` unmount their content while closed, so a lazy component inside them is only downloaded when opened.

**Incorrect (zod + react-hook-form ship with the sidebar on every screen):**

```tsx
import { ProfileForm } from "./profile-form"

<AppSheet open={isProfileOpen} onOpenChange={setIsProfileOpen} title="Meu Perfil">
  <ProfileForm onSuccess={() => setIsProfileOpen(false)} />
</AppSheet>
```

**Correct (form downloads when the sheet opens):**

```tsx
import { lazy, Suspense } from "react"

// module scope — never inside the component
const ProfileForm = lazy(() => import("./profile-form").then((m) => ({ default: m.ProfileForm })))

<AppSheet open={isProfileOpen} onOpenChange={setIsProfileOpen} title="Meu Perfil">
  <Suspense fallback={<Loader2 className="size-6 animate-spin" />}>
    <ProfileForm onSuccess={() => setIsProfileOpen(false)} />
  </Suspense>
</AppSheet>
```

When the trigger lives inside the component (e.g. `<DialogTrigger>`), split the file: a small static shell with the dialog and trigger, and a lazy default-exported form. See `components/layout/feedback-dialog.tsx` + `feedback-form.tsx`.

Don't lazy-load small components: each chunk is one more request. Worth it for anything that pulls a library (forms with zod, Recharts, PapaParse, WebRTC) or is several KB of its own.
