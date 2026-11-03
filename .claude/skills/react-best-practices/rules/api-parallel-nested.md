---
title: Chain Nested Fetches Per Item
impact: CRITICAL
impactDescription: one slow item no longer blocks the rest
tags: api, parallel-fetching, promise-chaining
---

## Chain Nested Fetches Per Item

When each item needs a second, dependent fetch, chain it inside the item's promise. Two `Promise.all` stages make every item wait for the slowest one in the first stage.

**Incorrect (a single slow item blocks all nested fetches):**

```ts
const clinics = await Promise.all(clinicIds.map((id) => clinicService.getById(id)))
const owners = await Promise.all(clinics.map((c) => userService.getById(c.ownerId)))
```

**Correct (each item chains independently):**

```ts
const owners = await Promise.all(
  clinicIds.map((id) => clinicService.getById(id).then((c) => userService.getById(c.ownerId))),
)
```

Better still, when both live in Postgres: one query with a join (Drizzle `with`/`leftJoin`) instead of N+1 round-trips.
