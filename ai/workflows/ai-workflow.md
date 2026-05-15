# AI Workflow

## The Basic Loop

Use Markdown files as small, reusable work orders:

1. Keep durable context in `ai/context/`.
2. Create one focused task file in `ai/tasks/`.
3. Ask the AI to read only the relevant context plus that task.
4. Let the AI implement, then review the diff.
5. Run checks.
6. Update the task and context docs if reality changed.

## Recommended Prompt

```text
Read:
- ai/context/project-brief.md
- ai/context/stack-and-scripts.md
- ai/context/architecture.md
- ai/context/<frontend-or-backend-guidelines>.md
- ai/tasks/<task>.md

Then implement the task in this repo. Keep the diff scoped, follow existing
patterns, protect user data, and run the relevant checks. Before editing, check
git status and do not overwrite unrelated changes.
```

## How To Split Tasks

Good task files are narrow enough to complete in one sitting.

Good examples:

- Add search to the patients table.
- Add a backend filter to `financial.list`.
- Fix PDF download behavior in clinical records.
- Add a migration and UI field for patient emergency contact.

Too large:

- Rebuild the scheduling module.
- Make the app production-ready.
- Add payments, invoices, receipts, and patient billing.

Split large work into discovery, backend, frontend, migration, and QA tasks.

## Review Checklist

Before accepting AI changes:

- Does the diff stay inside the task scope?
- Does it preserve existing user-facing Portuguese language?
- Does every protected API operation scope data to the current user?
- Were migrations added when schema changed?
- Were query invalidations or refetches updated after mutations?
- Did the AI avoid reading or exposing secrets?
- Were relevant scripts run?
- Was `ai/` updated if architecture or workflow knowledge changed?

## Suggested Task Lifecycle

Use statuses in task files:

- `draft`: idea is not ready.
- `ready`: enough context to implement.
- `in_progress`: being worked on.
- `review`: implementation exists and needs review.
- `done`: merged/accepted.

