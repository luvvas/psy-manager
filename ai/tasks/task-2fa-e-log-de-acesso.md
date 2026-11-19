# Task: Autenticação em dois fatores e registro de acesso ao prontuário

Status: draft — confirmar com as psicólogas se 2FA é opcional ou obrigatório.

## Goal

A psicóloga pode ligar 2FA (app autenticador) na conta, e cada leitura de prontuário e
documento fica registrada (quem, quando, qual paciente), visível para ela.

## Context

- `apps/api/src/lib/auth.ts` — better-auth sem plugins de 2FA. Versão presa em `~1.6.30`
  (`ai/memory/current-state.md`): usar o plugin `twoFactor` dessa linha, sem subir para 1.7.
- Leituras de prontuário: `apps/api/src/routes/clinical-record.ts`; documentos:
  `apps/api/src/routes/document.ts` (URLs de leitura do R2).
- `ai/context/backend-guidelines.md`, `ai/context/domain-model.md`.

## Requirements

- 2FA por TOTP com códigos de recuperação; tela em Configurações para ligar e desligar.
- Tabela `access_log` (psicóloga, paciente, recurso, ação, data, IP truncado), só inserção.
- Registro na leitura de prontuário, geração de URL de documento e exportação de PDF.
- Tela "Registro de acessos" por paciente, só da própria psicóloga.
- Migration gerada (`bun run db:generate`).

## Constraints

- O log não guarda conteúdo clínico, só o fato do acesso.
- Sem comentários no código. Texto em pt-BR.

## Acceptance Criteria

- Teste de integração: login com 2FA ligado exige código; log é criado em cada leitura e
  outra psicóloga não lê o log alheio.

## Suggested Verification

```bash
bun run test:integration
bun run test:e2e
```
