# Task: Feature flags

Status: review — branch `feat/pagamentos`.

## Goal

Ligar e desligar funcionalidades por configuração, sem deploy, para todas as psicólogas, uma
porcentagem delas ou contas específicas. Primeira flag: `pagamentos`.

## Context

- `apps/web/src/components/layout/app-sidebar.tsx` (`NAV_ITEMS[].ready`) e variáveis de ambiente
  eram o único "liga/desliga", ambos exigindo deploy.
- Padrões: `apps/api/src/services/*`, `apps/api/src/trpc/index.ts`, `apps/web/src/lib/trpc.ts`.

## Requirements

- Tabelas `feature_flag` (`key`, `enabled`, `rollout_percent`, `description`) e
  `feature_flag_override` (`flag_key`, `psychologist_id`, `enabled`, único por par).
- Ordem de decisão: override da psicóloga → `enabled` → bucket estável de 0–99 (hash de
  `key:userId`) menor que `rollout_percent`.
- `featureFlags.list` (protegida) devolve o mapa das flags conhecidas para a sessão.
- `flaggedProcedure(key)` responde `FORBIDDEN` quando a flag está desligada para a psicóloga.
- Hook `useFeatureFlag(key)` no web, lendo a query acima.
- Migration já cria a linha `pagamentos` desligada.

## Constraints

- Sem serviço externo (VPS única, dados clínicos).
- Flag é liga/desliga; nada de segredo ou configuração complexa.
- Flags de lançamento são removidas do código depois de ligadas para todas.

## Acceptance Criteria

- Flag desligada: a UI some e a API recusa. Override ligado para uma conta: só ela vê.
- Testes de integração cobrem override, porcentagem estável e `FORBIDDEN`.

## Suggested Verification

```bash
bun run test:integration
```

Ligar para uma conta: `insert into feature_flag_override (id, flag_key, psychologist_id, enabled)
values (gen_random_uuid(), 'pagamentos', '<user id>', true);`
