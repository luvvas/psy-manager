# Task: Testes end-to-end do web (Playwright)

Status: review — branch `test/e2e`.

## O que foi feito

- `apps/e2e/` (workspace `@psy-manager/e2e`): Playwright + Chromium, 18 testes em 11 specs,
  estáveis em 3 execuções seguidas (local e com `CI=1`). Script `test:e2e` na raiz.
- `apps/e2e/scripts/api-server.ts`: recria o banco `psy_manager_e2e` no Postgres de teste,
  migra e sobe a API real (com WebSocket) na porta 3101.
- `apps/web/vite.config.ts`: proxy de dev/preview espelha o nginx (`/trpc`, `/api`, `/ws`) e
  o alvo vem de `API_PROXY_TARGET`. Antes, upload/leitura de PDF local e a teleconsulta não
  passavam pelo proxy do dev server.
- Rate limit resolvido sem tocar na API: cada contexto do navegador usa um
  `cf-connecting-ip` aleatório.
- CI: job `e2e` no `deploy.yml` (Postgres de serviço, report/trace como artefato em falha) e
  o `deploy` passa a depender dele.

Jornadas cobertas: cadastro com validação, login com retorno à rota pedida, senha errada,
guard de `/login`; paciente (validação, busca, edição, detalhe, exclusão); agenda (criar,
visões dia/semana/mês, aviso de conflito com confirmação, reagendar, excluir, fim antes do
início); prontuário (validação, PDF anexado e lido do storage, assinatura trava o registro,
paciente inexistente); isolamento entre psicólogas; clínica (cadastro, sala, aviso de sala
duplicada, convite aceito, agenda compartilhada sem dados do paciente, "só os meus");
financeiro (receita, despesa, abas, edição, exclusão); documentos (PDF obrigatório, não-PDF,
>10MB, modelo, abrir, excluir); importação CSV de pacientes com mapeamento; exportar dados e
excluir conta; sair; sessão expirada → login; teleconsulta ponta a ponta com WebRTC real.

## Pendentes

- Redefinição de senha: sem SMTP de teste o link não sai da API; precisaria de um
  transporte de e-mail capturável (ex.: Mailpit no compose de teste).
- Configuração da agenda de trabalho pelo perfil e horários livres no formulário.
- Google Calendar: só coberto na integração (OAuth/sync com fetch stubado).
- Importação CSV do financeiro.

## Follow-ups

- Acessibilidade: o select "Tipo" do formulário financeiro não está ligado ao `<Label>`
  (o teste usa o primeiro combobox).

## Goal

Cobrir as jornadas operacionais da psicóloga no navegador real (web build + API + Postgres),
pegando regressões de contrato tRPC, rotas, guards, formulários e invalidação de cache que os
testes de API não veem.

## Context

Relevant files:

- `apps/web/src/router.tsx`, `apps/web/src/route-modules.ts`
- `apps/web/src/features/auth/auth-guard.tsx`, `apps/web/src/lib/query-client.ts` (401 → `/login`)
- `apps/web/src/features/**` — telas
- `apps/api/src/lib/rate-limit.ts` — limites de auth em memória por IP
- `apps/api/src/db/seed.ts` — seed com faker, não determinístico (não usar no E2E)
- Depende da infraestrutura de banco de teste e de `createApp()` de
  `ai/tasks/task-testes-integracao.md`

Existing behavior:

- Não há Playwright, `data-testid` nem DOM test environment.
- Inputs têm `id` + `<Label htmlFor>` (`getByLabel` funciona); botões de ação têm `id`
  (`btn-new-patient`, `btn-new-appointment`, `btn-new-clinic`, `btn-connect-google`,
  `tab-month-view`…).
- Exclusões usam `window.confirm`; excluir conta usa Dialog.
- `/consulta/:sessionId` exige `wsAuthToken` no state do router; reload volta para
  `/agendamento`.
- Sign-in limitado a 10 por 15 min por IP.

## Requirements

### Infraestrutura

- `@playwright/test` em `apps/e2e/` (workspace), só Chromium; script `test:e2e` na raiz.
- `webServer`: API apontando para o banco de teste com migrations + `vite preview` do build.
- `globalSetup`: limpa o banco, cria as usuárias A e B pela API e salva `storageState` de cada
  uma (login pela UI só no teste de login).
- Resolver o rate limit em teste: preferir IP distinto por worker via `cf-connecting-ip`;
  bypass por env só se necessário e nunca ativo em produção.
- Handler de `dialog` para `window.confirm`.
- Teleconsulta: `--use-fake-ui-for-media-stream` e `--use-fake-device-for-media-stream`.
- Adicionar `data-testid` só onde `getByRole`/`getByLabel`/`id` não bastarem.
- Job de CI separado, com trace e vídeo como artefato em falha.

### Jornadas

**P0**
1. Cadastro com validações (CRP, telefone) → `/inicio`; logout → `/login`; rota protegida sem
   sessão vai para `/login` e volta para a rota original após entrar.
2. Paciente: CPF/email inválidos mostram erro → cadastro válido → aparece na busca → editar →
   detalhe → excluir.
3. Agenda: configurar agenda de trabalho no perfil → criar sessão → aparece nas visões mês,
   semana e dia → conflito mostra aviso → reagendar → cancelar.
4. Prontuário: "Novo Registro" em texto → "Assinar" → editar/excluir somem; registro com PDF →
   visualizar.
5. Isolamento: B não vê pacientes de A; `/pacientes/<id de A>` mostra a tela de não encontrado.

**P1**
6. Clínica: A cria clínica e sala, convida B → B vê o banner, aceita → agendamento de A com sala
   aparece para B sem nome do paciente; o switch "só os meus" filtra.
7. Financeiro: receita e despesa, filtro de período, totais no Resumo; importação CSV.
8. Documentos: upload de PDF (rejeita não-PDF e arquivo acima de 10MB), visualizar, editar,
   excluir; aba Modelos.
9. Importação CSV de pacientes com mapeamento de colunas.

**P2**
10. Teleconsulta: psicóloga inicia → copia link → paciente em contexto sem login abre
    `/consulta/entrar/:token` → entra → ambos conectados → encerrar → link mostra "Link inválido".
11. Redefinir senha com o email capturado (SMTP mockado ou log).
12. Exportar dados; excluir conta → login falha depois.
13. Sessão expirada → próxima query leva a `/login`.

## Constraints

- Keep user-facing text in pt-BR.
- Follow existing patterns in nearby files.
- Do not touch unrelated modules.
- Do not read or expose `.env` secrets.
- Sem comentários no código.
- Cada teste cria os próprios dados (sem depender de ordem ou do seed com faker).
- Nenhum serviço externo real (Google, R2, TURN, SMTP) é chamado.

## Acceptance Criteria

- `bun run test:e2e` passa localmente a partir de um banco vazio, com P0 completo.
- P1 e P2 cobertos ou listados aqui como pendentes.
- CI roda a suíte e publica trace em falha.
- `ai/context/stack-and-scripts.md` documenta como rodar.

## Suggested Verification

```bash
bun run docker:db
bun run build:web
bun run test:e2e
```
