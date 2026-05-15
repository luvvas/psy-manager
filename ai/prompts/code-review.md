# Code Review Prompt

Use this to ask AI for review only, not implementation.

```text
You are reviewing changes in the psy-manager repo.

Read:
- ai/context/project-brief.md
- ai/context/architecture.md
- ai/context/domain-model.md
- ai/context/frontend-guidelines.md
- ai/context/backend-guidelines.md

Review the current diff with a bug-risk mindset.

Focus on:
- Data isolation and auth scope.
- Clinical/document privacy.
- Broken tRPC contracts.
- Missing schema migrations.
- Incorrect React Query invalidation/refetch behavior.
- UI regressions in operational workflows.
- Build/lint/type errors.
- Missing tests or manual verification gaps.

Return findings first, ordered by severity, with file and line references.
If there are no findings, say that clearly and list residual risks.
Do not rewrite code unless asked.
```

