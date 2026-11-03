---
name: executar-task
description: Executa uma task planejada de ai/tasks/ no psy-manager — carrega só o contexto de ai/context que a task pede, implementa no escopo, roda as verificações, atualiza o Status da task e os arquivos de ai/ que ficaram desatualizados. Também cria uma task nova a partir de ai/tasks/_template.md. Use quando o usuário citar um arquivo de ai/tasks, pedir para "fazer/continuar/retomar a task X", ou pedir para planejar/escrever uma task.
---

# Executar (ou escrever) uma task de `ai/tasks/`

As tasks são ordens de serviço pequenas, versionadas com o código. O `CLAUDE.md` já traz as
regras gerais; esta skill cobre o ciclo de vida da task.

## Escrever uma task nova

1. Copie `ai/tasks/_template.md` para `ai/tasks/task-<nome-curto>.md`.
2. Preencha com o que foi **verificado no código** (arquivos reais, comportamento atual),
   não com suposições. Liste em *Context* os arquivos de `ai/context/` relevantes.
3. Tamanho certo: dá para terminar numa sessão. "Refazer o módulo de agenda" é grande
   demais — quebre em descoberta, backend, migration, frontend e QA.
4. `Status: draft` até ter contexto suficiente; aí `ready`.

## Executar uma task

1. Leia a task inteira. Se `Status` for `draft` ou `blocked`, pare e diga o que falta.
2. Leia **só** os arquivos de `ai/context/` que a task e o tipo de mudança pedem
   (tabela no `CLAUDE.md`). Para tela nova, use também a skill `nova-tela`; para código
   React, a skill `react-best-practices`.
3. Confira se a premissa ainda vale: os arquivos citados existem? O comportamento
   descrito em *Existing behavior* ainda é o atual? Se não, ajuste a task antes de
   implementar e avise.
4. `Status: in_progress`. Implemente dentro do escopo; o que aparecer fora dele vira
   nota em *Follow-ups* da task, não código.
5. Rode as verificações da seção *Suggested Verification* e as relevantes do
   `CLAUDE.md`. Não marque como feita se algo falhou.
6. Feche o ciclo:
   - `Status: review` (implementado, aguardando revisão) ou `done` (aceito/mergeado);
   - atualize `ai/context/*` e `ai/memory/current-state.md` se arquitetura, deploy ou
     premissas mudaram;
   - task `done` e já mergeada pode ser apagada — o git guarda o histórico. Se algum
     doc em `docs/` ou comentário de código aponta para ela, troque a referência.

## Relatório final

- O que mudou (arquivos, em uma linha cada).
- Verificações rodadas e resultado; o que não pôde ser rodado.
- Como verificar no navegador, se for UI.
- Riscos e follow-ups.

## Status possíveis

`draft` → `ready` → `in_progress` → `review` → `done`; `blocked` quando depende de algo
externo (diga do quê na primeira linha).
