# Task: Web — Fase 4, invalidação e carregamento

Status: review — branch `refactor/web-fase-4-dados` (empilhado sobre a fase 3).

## O que mudou

- Mutations invalidam o router inteiro e os routers de outras telas que mostram o
  mesmo dado, em vez de `refetch()` da lista local:
  - agenda → `appointment` (inclui `freeSlots`/`checkSlot`, que ficavam velhos);
  - paciente editado/excluído → `patient`, `appointment`, `financial`;
  - clínica (criar, editar, vínculo, convite, sair) → `clinic`, `appointment`;
  - transação → `financial` (o Início deixa de ficar velho);
  - registro clínico → `clinicalRecord` sem input (a chave do Início não era atingida).
- `staleTime: 30_000` global, agora que a invalidação está certa.
- Carregamento: KPIs (`StatsCards`), painéis do Início (`HomePanel`) e todas as
  `DataTable` mostram esqueleto em `isPending`, em vez de "0" ou "nenhum cadastro".
- Financeiro: o período só vira filtro quando tem início e fim; `placeholderData`
  mantém os dados anteriores na troca (não pisca para zero).
- Início: uma `financial.list` em vez de duas (o mês é derivado da lista completa).
- Agenda: URL do Google pedida só no clique (antes, cada visita gerava um `state`
  OAuth de uso único); `isSyncing` virou `isPending` da mutation.
- `mutateAsync` sem `catch` → `mutate` + `onError` (documentos, prontuário); feedback
  engole a rejeição já tratada no `onError`.

## Verificação

`bun run build:web`, `bun test` 10/10, lint 10. Manual: lançar uma transação e abrir o
Início sem F5; editar um paciente e conferir o nome na agenda; criar sala numa clínica e
ver os horários livres na agenda; trocar o período do financeiro escolhendo as duas datas.
