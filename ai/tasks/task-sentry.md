# Task: Monitoramento de Erros com Sentry

Status: draft

## Goal

Integrar o Sentry na API e no frontend para capturar automaticamente erros em
produção, com stack traces e contexto suficiente para reproduzir e corrigir
falhas sem depender de relato do usuário.

## Context

Relevant files:

- `apps/api/src/index.ts` — entry point da API, onde o Sentry deve ser inicializado antes de tudo
- `apps/api/src/routes/router.ts` — router tRPC, onde erros de procedure são centralizados
- `apps/web/src/main.tsx` — entry point do frontend
- `apps/web/vite.config.ts` — configuração do Vite, onde o plugin de source maps vai
- `.env.example` — adicionar as variáveis de DSN aqui

Existing behavior:

- Erros não tratados na API não são registrados em nenhum sistema externo.
- Erros de runtime no frontend são silenciosos em produção.

## Requirements

### Pré-requisito manual

- Criar um projeto do tipo **Node.js** no Sentry (sentry.io) e anotar o DSN.
- Criar um projeto do tipo **React** no Sentry e anotar o DSN (pode ser o mesmo
  projeto com dois DSNs, ou dois projetos separados).

### Variáveis de ambiente

Adicionar ao `.env.example` (sem valores reais):

```
SENTRY_DSN=
VITE_SENTRY_DSN=
SENTRY_AUTH_TOKEN=   # usado só no build para upload de source maps
```

### API (`@sentry/node`)

- Instalar `@sentry/node`.
- Inicializar o Sentry no topo de `apps/api/src/index.ts`, **antes** de qualquer
  import do Hono ou do router — `Sentry.init({ dsn, environment, tracesSampleRate })`.
- Adicionar um error handler global no final do app Hono que chame
  `Sentry.captureException(err)` antes de retornar 500.
- Não enviar dados de pacientes (nome, CPF, notas clínicas) como contexto extra.
  Enviar apenas: `psychologistId`, rota, método HTTP e código de status.

### Frontend (`@sentry/react`)

- Instalar `@sentry/react` e `@sentry/vite-plugin`.
- Inicializar o Sentry em `apps/web/src/main.tsx` com
  `Sentry.init({ dsn, environment, tracesSampleRate, integrations: [Sentry.browserTracingIntegration()] })`.
- Envolver o `RouterProvider` (ou raiz da app) com `Sentry.ErrorBoundary` para
  capturar erros de renderização React.
- Configurar o `sentryVitePlugin` em `vite.config.ts` para fazer upload de
  source maps no build de produção usando `SENTRY_AUTH_TOKEN`.

### Ambiente

- Em desenvolvimento (`NODE_ENV !== 'production'`) o Sentry deve estar desabilitado
  (`enabled: false`) para não poluir os eventos.

## Constraints

- Keep user-facing text in pt-BR.
- Não enviar para o Sentry nenhum dado clínico ou pessoal de pacientes (LGPD).
- Não alterar lógica de negócio existente — apenas adicionar instrumentação.
- Do not touch unrelated modules.
- Do not read or expose `.env` secrets.

## Acceptance Criteria

- Uma exception lançada em qualquer handler tRPC aparece no painel do Sentry com
  stack trace completo.
- Um erro de renderização React em produção aparece no Sentry com o nome do
  componente.
- `bun run build` passa sem erros de tipo.
- Em `NODE_ENV=development` nenhum evento é enviado ao Sentry.
- As variáveis `SENTRY_DSN` e `VITE_SENTRY_DSN` estão documentadas no `.env.example`.

## Suggested Verification

```bash
bun run build
# lançar uma exception manual em um handler e confirmar que aparece no Sentry
# verificar no painel: stack trace, environment = production, sem dados de paciente
```
