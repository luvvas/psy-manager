---
name: entregar-task
description: Leva uma task de ai/tasks/ do início ao PR aberto no psy-manager, sem parar entre as etapas — branch próprio, implementação, testes, teste manual no navegador, code review, correção dos achados, um commit e PR. Use quando o usuário pedir para "entregar", "fazer de ponta a ponta", "implementar e abrir PR" ou para seguir várias tasks em sequência.
---

# Entregar uma task de ponta a ponta

Cadeia: `executar-task` → testes → teste manual → `/code-review` → correções →
commit → `abrir-pr`. Chamar esta skill autoriza criar o branch, commitar e abrir o PR.
Não autoriza merge.

## 0. Escolher a task

- Nomeada pelo usuário, ou a primeira com `Status: ready` em `ai/tasks/`.
- `draft` ou `blocked`: pule e diga por quê. Nunca resolva sozinha uma decisão listada
  em "Decisões em aberto"; essas são do usuário.

## 1. Branch

Um assunto por branch, a partir do master atualizado:

```bash
git fetch origin
git switch -c <tipo>/<nome-curto> origin/master
```

`<tipo>` é o tipo de Conventional Commit (`feat`, `fix`, `refactor`…). Se o working tree
atual tem trabalho de outra coisa, use um worktree (`git worktree add ../psy-manager-<nome> -b <branch> origin/master`)
em vez de misturar.

## 2. Implementar

Siga a skill `executar-task` (ela carrega o contexto, implementa e atualiza `ai/`). Tela
nova: `nova-tela`. Código React: `react-best-practices`.

## 3. Testes

- Teste unitário para a lógica nova (`apps/api/tests`, `apps/web` com `bun test`).
- Teste de integração quando mexer em router, service, CQRS ou banco.
- Rode as verificações da tabela da skill `abrir-pr`. Vermelho: corrija antes de seguir.

## 4. Teste manual no navegador

Para mudança visível no web: suba o ambiente (skill `run`; `bun run dev`, web em
`http://localhost:5173`, login do seed — skill `recriar-ambiente` se o banco estiver
sujo) e percorra o fluxo do critério de aceite com a skill `claude-in-chrome`. Anote o
que foi clicado e o que apareceu. Sem navegador disponível: diga isso no PR, não finja.

## 5. Code review e correções

Rode `/code-review` sobre o diff do branch. Corrija os achados que são bugs ou quebram
regra do `CLAUDE.md`; os que você decidir não corrigir vão para a seção Riscos do PR com
o motivo. Depois das correções, repita o passo 3.

## 6. Commit

Um commit por branch, no padrão do `CONTRIBUTING.md` (o porquê no corpo, sem comentário
no código), com o rodapé de coautoria pedido pela sessão. Se houve commits
intermediários, junte com `git reset --soft origin/master` e commite de novo.
Marque a task como `Status: review` no mesmo commit.

## 7. PR

Siga a skill `abrir-pr`. Na seção Verificação, liste testes, teste manual e o resultado
do code review.

## 8. Próxima

Se o usuário pediu várias tasks, volte ao passo 0 a partir do `origin/master`, não do
branch anterior. Uma task que dependa de outra ainda sem merge: pare e avise em vez de
empilhar branches.

## Relatório final

Por task: branch, link do PR, verificações e resultado, achados do review corrigidos e
não corrigidos, e o que ficou para o usuário decidir.
