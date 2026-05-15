# Frontend Task Prompt

Use this for UI-focused work.

```text
You are implementing a frontend task in psy-manager.

Read:
- ai/context/project-brief.md
- ai/context/stack-and-scripts.md
- ai/context/architecture.md
- ai/context/frontend-guidelines.md
- ai/tasks/<task-file>.md

Rules:
- Keep user-facing text in pt-BR.
- Use existing layout components and UI primitives.
- Keep the interface dense, practical, and consistent with the app.
- Use lucide-react icons when an icon is needed.
- Use tRPC hooks from apps/web/src/lib/trpc.ts.
- Preserve mobile and desktop usability.
- Run at least the relevant web build or lint check if possible.

Output:
- What changed.
- How to verify in the browser.
- Checks run.
```

