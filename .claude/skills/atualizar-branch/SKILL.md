---
name: atualizar-branch
description: Atualiza o branch atual do psy-manager sobre origin/master com rebase, resolve conflitos mecânicos e para nos que envolvem regra de negócio, migration ou código de outra pessoa. Use quando o usuário pedir rebase, atualizar o branch, trazer o master, ou quando abrir-pr encontrar conflito.
---

# Atualizar branch (rebase em origin/master)

## Regras

- Nunca rebase o `master` nem um branch que outra pessoa usa.
- `git status --short` precisa estar limpo; se não estiver, pergunte (commit ou `git stash`).
- Antes de começar, anote o hash atual: `git rev-parse HEAD`. É o caminho de volta
  (`git rebase --abort` durante, `git reset --hard <hash>` depois, só com o usuário).

## Passos

```bash
git fetch origin
git rebase origin/master
```

Para cada conflito, `git diff --name-only --diff-filter=U` e classifique:

| Tipo | O que fazer |
|---|---|
| Imports, ordem de itens, os dois lados adicionaram coisas independentes | Resolva mantendo os dois |
| `bun.lock` | Fique com a versão do master e rode `bun install` |
| `apps/api/drizzle/meta/_journal.json` ou migrations com o mesmo número | **Pare.** Renumerar migration exige gerar de novo (`bun run db:generate`) sobre o schema do master; explique e pergunte |
| Regra de negócio, posse (`psychologistId`), CQRS, prontuário | **Pare** e mostre os dois lados com a sua proposta |
| `ai/` | Junte o conteúdo; o mais recente sobre o estado do sistema vence |

Depois de resolver: `git add <arquivos>` e `git rebase --continue`.

## Depois

- Rode as verificações dos arquivos que tiveram conflito (tabela da skill `abrir-pr`).
- Branch já publicado: `git push --force-with-lease`. Nunca `--force` puro.
- Relate: commits reaplicados, conflitos e como foram resolvidos, verificações.
