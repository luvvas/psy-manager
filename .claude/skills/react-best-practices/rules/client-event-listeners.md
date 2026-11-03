---
title: Deduplicate Global Event Listeners
impact: LOW
impactDescription: single listener for N components
tags: client, event-listeners, subscription, useSyncExternalStore
---

## Deduplicate Global Event Listeners

When a hook that attaches a global listener is used by many components, each instance registers its own listener. Keep one module-level listener and a registry of callbacks.

**Incorrect (N instances = N listeners):**

```tsx
function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === key) callback()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [key, callback])
}
```

**Correct (N instances = 1 listener):**

```tsx
const keyCallbacks = new Map<string, Set<() => void>>()

function onKeyDown(e: KeyboardEvent) {
  if (e.metaKey) keyCallbacks.get(e.key)?.forEach((cb) => cb())
}

function useKeyboardShortcut(key: string, callback: () => void) {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback // always call the latest callback
  })

  useEffect(() => {
    const onShortcut = () => callbackRef.current()
    if (keyCallbacks.size === 0) window.addEventListener("keydown", onKeyDown)
    const set = keyCallbacks.get(key) ?? new Set()
    set.add(onShortcut)
    keyCallbacks.set(key, set)

    return () => {
      set.delete(onShortcut)
      if (set.size === 0) keyCallbacks.delete(key)
      if (keyCallbacks.size === 0) window.removeEventListener("keydown", onKeyDown)
    }
  }, [key])
}
```

For shared **state** derived from a global event (online status, media query, visibility), use `useSyncExternalStore` with a module-level `subscribe`, which React deduplicates for you.

Reference: [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
