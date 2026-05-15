# AI Workspace

This folder is the project context layer for AI-assisted work on `psy-manager`.
Use it to keep prompts, architecture notes, conventions, and task specs versioned
with the codebase.

## How To Use This Folder

For most implementation work, give the AI this load order:

1. `ai/context/project-brief.md`
2. `ai/context/stack-and-scripts.md`
3. `ai/context/architecture.md`
4. `ai/context/domain-model.md`
5. A focused guide, such as `ai/context/frontend-guidelines.md` or `ai/context/backend-guidelines.md`
6. One task file from `ai/tasks/`

Example prompt:

```text
Read ai/context/project-brief.md, ai/context/architecture.md,
ai/context/frontend-guidelines.md, and ai/tasks/<task-name>.md.
Implement the task, keep changes scoped, and run the relevant checks.
```

## Folder Map

- `context/`: durable project knowledge that should stay true across many tasks.
  Start with the brief/architecture files, then load `api-surface.md` or
  `frontend-surface.md` when the task needs a route or screen map.
- `workflows/`: how to collaborate with AI on this repo.
- `prompts/`: reusable role prompts for implementation, debugging, review, and UI work.
- `tasks/`: one-off task specs. Copy `_template.md` before starting new work.
- `memory/`: current state, known risks, and working notes that may change frequently.

## Rules For Future AI Work

- Keep user-facing UI text in Brazilian Portuguese.
- Do not read or paste secrets from `.env`; use `.env.example` for public config shape.
- Respect uncommitted user changes. Check `git status --short` before editing.
- Prefer existing patterns in `apps/api/src/routes`, `apps/api/src/services`, and `apps/web/src/features`.
- Keep changes small enough to review. Split large work into multiple task files.
- After implementation, update the relevant files in `ai/` when architecture, workflows, or assumptions change.
