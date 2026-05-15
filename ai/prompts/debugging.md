# Debugging Prompt

Use this when something is broken and the first step should be investigation.

```text
You are debugging psy-manager.

Read:
- ai/context/project-brief.md
- ai/context/stack-and-scripts.md
- ai/context/architecture.md
- ai/context/domain-model.md

Problem:
<describe the bug, error message, route, user action, and expected behavior>

Investigate first:
- Reproduce if possible.
- Identify the module and data flow.
- Check relevant tRPC route/service/query/component.
- Look for recent changes in git status/diff.

Then fix the smallest likely cause, run relevant checks, and summarize:
- Root cause.
- Files changed.
- Verification.
- Any remaining risk.
```

