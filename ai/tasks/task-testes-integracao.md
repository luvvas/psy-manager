# Task: Testes de integração da API (Postgres real)

Status: review — branch `test/integracao-api`.

## O que foi feito

- `apps/api/src/app.ts`: `createApp()` + `initProjections()` (idempotente); `index.ts`
  ficou só com env, Sentry, `serve` e WebSocket. `REQUEST_LOG=off` desliga o logger HTTP.
- `docker-compose.test.yml`: Postgres descartável (porta 5433, tmpfs, `psy_test`).
- `apps/api/tests-integration/`: 93 testes em 10 arquivos; scripts `test:integration`,
  `test:integration:db` e `test:integration:db:down`. `test` do pacote api passou a ser
  `bun test ./tests` para não pegar a suíte nova.
- CI: Postgres como serviço no `quality-gate` e passo `bun run test:integration`.
- Bug corrigido: reagendar não apaga mais o `googleEventId` na projeção
  (`appointment.projections.ts`), então o sync do Google não duplica a sessão.
- Docs: `ai/context/stack-and-scripts.md`, `architecture.md`, `api-surface.md`,
  `ai/memory/current-state.md`, `CLAUDE.md` (verificações).

Diferenças em relação ao catálogo original, conferidas no banco:

- Membro removido da clínica: as sessões dele **continuam visíveis** (sem paciente) para
  quem ficou, além de bloquear a sala. Teste fixa isso.
- `patient.createMany` não dá para falhar pela metade via API (o zod valida o lote antes).
  Em troca apareceu uma lacuna pior: `valorSessao` não numérico grava o evento, a
  projeção falha em silêncio e a API responde sucesso — o paciente some.
- Nome de sala repetido só é barrado no web; a API aceita.
- Corrida finalize × update no prontuário e convites concorrentes não foram cobertos:
  dependem de timing e ficariam instáveis.

## Follow-ups

- Validar `valorSessao` e `financial.amount` como número no zod (BAD_REQUEST em vez de
  sumiço/500) e decidir o que fazer com falha de projeção (hoje só log + dead letter).
- Decidir se sessões de membro removido devem sumir para a clínica.
- Índice único em `psychologist_clinic (clinic_id, psychologist_id)` e
  `clinic_room (clinic_id, name)` onde `active`.
- Lock do prontuário com `status = 'draft'` no WHERE do UPDATE/DELETE.
- Workflow de CI em pull request (hoje o CI só roda em push no `master`).
- Typecheck dos testes no CI (`tsc` hoje cobre só `src`).

## Goal

Ter uma suíte `test:integration` que roda a API contra um Postgres real (migrations
aplicadas, Better Auth de verdade, event store, criptografia em coluna, cascatas de FK) e
cobre as regras de negócio que os testes unitários com `mock.module` não alcançam. Ela roda
localmente e no CI.

## Context

Relevant files:

- `apps/api/src/index.ts` — cria o Hono, inicializa projeções e chama `serve()` ao ser importado
- `apps/api/src/trpc/context.ts`, `apps/api/src/lib/auth.ts` — sessão via Better Auth (cookie)
- `apps/api/src/lib/cqrs/index.ts` — event store (versão otimista, `data` criptografado) e EventBus
- `apps/api/src/cqrs/{patient,appointment}/*` — comandos, aggregates, projeções, queries
- `apps/api/src/services/*.ts` — clínica, financeiro, documento, prontuário, storage, vídeo, disponibilidade
- `apps/api/src/lib/{rate-limit,encryption,oauth-state,env-check,work-schedule}.ts`
- `apps/api/src/db/migrate.ts`, `apps/api/drizzle/` (0000–0022)
- `apps/api/tests/utils/router-test-utils.ts` — padrão atual (tudo mockado)
- `.github/workflows/deploy.yml` — `quality-gate` sem Postgres; não há workflow de PR
- `docker-compose.yml` — serviço `db` (`postgres:17-alpine`)

Existing behavior:

- 52 testes unitários; nenhum toca o banco, Better Auth, HTTP ou storage.
- `mock.module` é global ao processo do `bun test`, então integração não pode rodar no mesmo
  processo dos testes de rota.
- O índice único `event_store(aggregate_id, version)` existe só em
  `drizzle/0009_performance_indexes.sql:34`, não em `schema.ts`; `db:push` não o cria.
- Estado em memória que vaza entre testes: oauth-state, tokens de upload/leitura de storage,
  rooms de WS, store do rate limit, EventBus (assinantes, contagem de falhas), cache da chave
  de criptografia.

## Requirements

### Infraestrutura

- Extrair `createApp()` para `apps/api/src/app.ts` (Hono + rotas + init das projeções, sem
  `serve`). `index.ts` passa a importar dele e só faz env/instrument/`serve`/WS. Comportamento
  de produção idêntico.
- Diretório `apps/api/tests-integration/` e script `test:integration` (raiz e pacote api),
  separado do `bun test` atual.
- Setup: banco `psy_manager_test`, roda `src/db/migrate.ts`, `TRUNCATE ... CASCADE` entre
  arquivos; init das projeções uma única vez.
- Env de teste: `ENCRYPTION_KEY` e `BETTER_AUTH_SECRET` fixos de teste (não vazados), sem
  `S3_BUCKET`/`STORAGE_DRIVER`, `LOCAL_STORAGE_DIR` em diretório temporário, sem `CF_TURN_*`,
  `SMTP_*`, `SENTRY_DSN`, `DISCORD_FEEDBACK_WEBHOOK_URL`; `TZ=America/Sao_Paulo`.
- Helpers: `signUp(email)` real via `app.fetch` → cookie → caller tRPC com
  `createContext({headers})`; função de reset dos estados em memória; stub de
  `globalThis.fetch` para Google.
- CI: job com `services: postgres` rodando `test:integration`.

### Casos

**Auth**
- Cadastro + login reais criam sessão; procedure protegida sem cookie → UNAUTHORIZED.
- Rate limit real (`lib/rate-limit.ts`): 11º sign-in em 15 min → 429; 6º reset de senha em 1 h
  → 429; teto de 30 em `/api/auth/*`; chave por `cf-connecting-ip` (regressão da #39).
- Reset de senha chama o envio de email (nodemailer mockado) com link.

**Isolamento entre psicólogas** (contas reais A e B)
- B não lista, lê, edita nem apaga paciente, transação, documento, prontuário ou sessão de
  vídeo de A.
- B não consegue usar `patientId`, `appointmentId`, `roomId` ou `storageKey` de A em
  create/update (FORBIDDEN).
- `psychologist.exportData` de B não contém dado de A.

**Paciente (CQRS)**
- Create grava `event_store` (versão 1, `data` com `__enc`) e projeção; PII criptografada no
  banco (SQL cru) e decriptada na leitura.
- Update incrementa versão; delete remove a projeção; update após delete falha.
- Dois updates concorrentes na mesma versão → um falha.
- Delete cascateia agendamentos, documentos e prontuários (inclusive finalizados) e zera
  `patient_id` em transações. Fixar o drift: aggregates de agendamento continuam no event store.
- `createMany` não é atômico: fixar o comportamento atual em falha parcial.

**Agendamento**
- Conflito de sala com outra psicóloga → CONFLICT mesmo com `allowScheduleConflicts`.
- Conflito próprio ou fora da agenda de trabalho → CONFLICT; passa com `allowScheduleConflicts`.
- Sessões encostadas não conflitam; canceladas não ocupam horário.
- `checkSlot` em update sem mudança → `unchanged`; `freeSlots` sem agenda → `configured:false`,
  sem slots no passado, buffer aplicado.
- Fronteira de dia em America/Sao_Paulo (sessões às 23:00 e 00:30).
- Sala inativa ou clínica sem vínculo ativo → FORBIDDEN.
- Visibilidade compartilhada: membro ativo vê agendamento com sala de colega sem paciente,
  notes e meetingUrl, `isOwn:false`; sem sala não aparece; membro pendente não vê.
- Cancelar remove a linha e zera `appointment_id` em prontuário e sessão de vídeo.
- **Bug conhecido**: reagendar zera `googleEventId` na projeção
  (`appointment.projections.ts:65`; o aggregate preserva em `appointment.aggregate.ts:151`), e o
  próximo sync duplica o evento. Escrever o teste, ver falhar, corrigir a projeção.
- Google (fetch stubado): OAuth state de uso único; state de outro usuário → FORBIDDEN; upsert
  de conta mantém refresh token antigo; sync importa, deduplica por `googleEventId` e casa
  paciente pelo nome.

**Clínica, salas e convites**
- Create vincula a criadora como ativa; só a criadora edita, apaga e gerencia salas (demais →
  NOT_FOUND).
- Nome de sala duplicado rejeitado; remover sala só arquiva.
- Convite para email inexistente responde sucesso; convite fica `pending`; convidada não vê a
  clínica até aceitar; aceitar/recusar convite inexistente → NOT_FOUND.
- Dona não sai; criadora não se desvincula; `leave` remove vínculo pendente também.
- Apagar clínica zera `clinic_id`/`room_id` dos agendamentos.
- Membro removido: agendamentos somem para as colegas mas ainda bloqueiam a sala (fixar).

**Financeiro**
- Filtro de período só com `startDate` e `endDate` juntos, inclusivo nas pontas.
- `description` criptografada; nome do paciente só para paciente próprio.
- `createMany` atômico; `amount` não numérico hoje vira 500 (fixar e anotar).
- update/delete de linha alheia retorna `null` (fixar contrato).

**Documentos e storage (driver local)**
- Fluxo `prepareUpload` → `PUT /api/storage/local-upload/:token` (204) → `create` →
  `getDownloadUrl` → `GET /api/storage/local-download/:token` devolve o PDF.
- Token de upload expirado → 410; content-type ou tamanho errado → 400; uso único.
- `storageKey` de outra psicóloga ou com `..` → FORBIDDEN.
- Delete apaga linha e arquivo.

**Prontuário**
- Nasce `draft`; editar ou apagar finalizado → FORBIDDEN; finalize idempotente com `lockedAt`.
- `appointmentId` de outro paciente da mesma psicóloga é aceito hoje (fixar e anotar).

**Teleconsulta**
- `create` gera token; banco guarda só o SHA-256; `validateToken` (público) devolve só o
  primeiro nome; sessão encerrada ou expirada → PRECONDITION_FAILED; token desconhecido →
  NOT_FOUND.
- `end` de sessão alheia não a encerra.
- Sem `CF_TURN_*` → só STUN.

**Conta**
- `deleteAccount` remove os dados e arquivos da usuária; não toca dados de B nem clínicas onde
  ela é só membro.

## Constraints

- Keep user-facing text in pt-BR.
- Follow existing patterns in nearby files.
- Do not touch unrelated modules.
- Do not read or expose `.env` secrets.
- Sem comentários no código.
- Testes que fixam comportamento questionável (marcados "fixar") documentam o atual; mudar a
  regra é outra task.
- Escrita de paciente e agendamento nos testes passa pelos comandos/procedures, nunca por
  insert direto (exceto para montar cenários sem rota, ex. sessão de vídeo expirada).

## Acceptance Criteria

- `bun run test:integration` sobe do zero contra um banco vazio e passa.
- `bun run test:api` continua passando e não é afetado pela suíte nova.
- O CI roda a suíte com Postgres de serviço.
- O bug do `googleEventId` está corrigido e coberto.
- `ai/context/stack-and-scripts.md` e `ai/memory/current-state.md` descrevem a suíte nova.

## Suggested Verification

```bash
bun run docker:db
bun run test:integration
bun run test:api
bun run build:api
```
