# AI Workspace

Project knowledge for AI-assisted work on `psy-manager`, versioned with the code.

The entry point is the root `CLAUDE.md`: it is loaded automatically, holds the rules,
and tells the agent which file below to read for each kind of task. Repeatable
workflows live as skills in `.claude/skills/`, not as prompts here.

## Folder Map

- `context/` — durable knowledge that stays true across many tasks (architecture,
  domain, API/screen maps, guidelines, deployment). Read on demand.
- `memory/current-state.md` — what is true *right now*: open findings, known gaps,
  things verified as correct that should not be "fixed". Changes often.
- `tasks/` — planned work orders. `_template.md` is the starting point; the
  `executar-task` skill runs or writes them. Delete a task once it is done and
  merged (git keeps the history).

## Skills (`.claude/skills/`)

| Skill | When |
|---|---|
| `nova-tela` | New screen/CRUD in `apps/web` following the existing pattern |
| `react-best-practices` | Writing, reviewing or refactoring React code in `apps/web` |
| `executar-task` | Running or writing a file in `ai/tasks/` |
| `security-audit` | Full-codebase security audit with PDF report |

Code review and debugging use Claude Code's built-in `/code-review` and normal
investigation; the project-specific checklist for both is in `CLAUDE.md`.

## Keeping This Folder True

After a change to architecture, deployment, or a documented assumption, update the
matching file here in the same piece of work. Stale context is worse than none.
