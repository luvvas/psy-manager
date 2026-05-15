# Implementation Prompt

Use this when asking AI to make a scoped code change.

```text
You are working in the psy-manager repo.

Read these files first:
- ai/context/project-brief.md
- ai/context/stack-and-scripts.md
- ai/context/architecture.md
- ai/context/domain-model.md
- ai/context/frontend-guidelines.md
- ai/context/backend-guidelines.md
- ai/tasks/<task-file>.md

Goal:
Implement the task exactly as specified.

Rules:
- Check git status before editing.
- Do not overwrite unrelated user changes.
- Keep user-facing UI text in pt-BR.
- Follow existing local patterns before adding abstractions.
- Scope API data by authenticated psychologist unless the task explicitly
  changes shared-clinic behavior.
- Add or update migrations when database schema changes.
- Run the most relevant checks and report what passed or could not be run.

Output:
- Briefly summarize files changed.
- Mention verification commands.
- Mention any follow-up risk or known limitation.
```

