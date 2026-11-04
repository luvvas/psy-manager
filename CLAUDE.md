# psy-manager

SaaS de gestão para psicólogas: agenda, pacientes, prontuário, documentos, financeiro,
clínicas e teleconsulta. Monorepo Bun com `apps/api` (Hono + tRPC + Drizzle/Postgres,
CQRS em paciente e agendamento) e `apps/web` (React 19 + Vite SPA + React Router +
TanStack Query via tRPC + Tailwind/shadcn). Produção: uma VPS (Hostinger) com Docker
Compose atrás de Cloudflare Tunnel; documentos e backups no R2.

## Contexto sob demanda (`ai/`)

Leia só o que a tarefa pede:

| Precisa de… | Leia |
|---|---|
| Visão do produto e dos módulos | `ai/context/project-brief.md` |
| Comandos, env vars, estrutura de testes | `ai/context/stack-and-scripts.md` |
| Camadas, fluxo de dados, storage | `ai/context/architecture.md` |
| Entidades, regras de posse e de negócio | `ai/context/domain-model.md` |
| Procedures tRPC por router | `ai/context/api-surface.md` |
| Rotas e telas do web | `ai/context/frontend-surface.md` |
| Padrões de UI, dados e formulários no web | `ai/context/frontend-guidelines.md` |
| Padrões de routers, services e CQRS | `ai/context/backend-guidelines.md` |
| Deploy, Docker, CI, Cloudflare | `ai/context/deployment.md` |
| Estado atual, riscos conhecidos, o que **não** "consertar" | `ai/memory/current-state.md` |
| Trabalho planejado | `ai/tasks/` (use a skill `executar-task`) |

Skills do projeto em `.claude/skills/`: `nova-tela`, `react-best-practices`,
`executar-task`, `security-audit`, `recriar-ambiente`.

## Regras

- Todo texto que a usuária vê é em **português do Brasil**.
- Commits seguem `CONTRIBUTING.md` (Conventional Commits; o hook `.githooks/commit-msg`
  rejeita o resto). O histórico de commits é a fonte das release notes.
- Não leia nem cole segredos de `.env`/`.env.prod`; o formato público está em
  `.env.example` e `.env.prod.example`. O repositório é **público**.
- Rode `git status --short` antes de editar e não sobrescreva mudanças alheias.
- **Sem comentários no código** (`//`, `/* */`, JSDoc, `{/* */}` no JSX). O porquê de uma
  decisão vai na mensagem do commit, no PR ou em `ai/`. Exceções: diretivas funcionais
  (`/// <reference>`, `@ts-expect-error`, `eslint-disable`).
- Copie o padrão vizinho (`apps/api/src/routes`, `apps/api/src/services`,
  `apps/web/src/features`) antes de criar abstração nova.
- Toda procedure protegida filtra pelo `psychologistId` da sessão, exceto onde a regra
  de clínica compartilhada diz outra coisa. IDs vindos do cliente (paciente,
  agendamento, `storageKey`…) têm a posse checada no servidor.
- Escrita de paciente e agendamento passa pelos comandos CQRS, nunca direto no banco.
- Mudou o schema → gere a migration (`bun run db:generate`).
- Depois de mutation no web, invalide/refetch as queries afetadas.
- Rode as verificações relevantes (`bun run test:api`, `bun run test:integration`, `bun run test:e2e`, `bun run test:web`,
  `bun run --filter @psy-manager/web lint`, `bun run build:web`) e diga o que rodou.
- Se a arquitetura, o deploy ou uma premissa mudar, atualize o arquivo de `ai/`
  correspondente no mesmo trabalho.

## Ao investigar um bug

Reproduza primeiro, siga o fluxo (componente → hook tRPC → router → service → banco),
olhe `git log`/`git diff` recentes e corrija a menor causa provável. Relate causa raiz,
arquivos alterados, verificação feita e risco restante.

## Ao revisar código

Achados primeiro, por severidade, com `arquivo:linha`. Neste projeto, olhe em especial:

- isolamento de dados entre psicólogas e escopo de clínica;
- privacidade de prontuário e documentos (URLs de leitura, PII decriptada);
- contrato tRPC quebrado entre api e web;
- schema alterado sem migration;
- invalidação de React Query faltando depois de mutation;
- regressão em fluxo operacional (agenda, cadastro de paciente);
- build, lint ou tipos quebrados; teste ou verificação manual faltando.

Sem achados, diga isso e liste os riscos residuais.
