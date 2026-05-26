# Task: Correções de Segurança — Quick Fixes (SEC-03, SEC-04, SEC-06, SEC-08, SEC-09)

Status: draft

## Goal

Corrigir cinco vulnerabilidades de baixo esforço identificadas na auditoria de
segurança: token WebSocket exposto em URL, link de reset de senha logado em plain
text, body de erro OAuth logado, endpoint de debug Sentry público em produção, e
endpoint de health expondo payloads internos do event bus.

## Context

Relevant files:

- `apps/web/src/features/consulta/psychologist-page.tsx` — [SEC-03] fallback de `wsAuthToken` via `searchParams`
- `apps/api/src/services/email.service.ts` — [SEC-04] `console.warn` com email + URL de reset
- `apps/api/src/routes/appointment.ts` — [SEC-06] `console.error` com body completo da resposta Google OAuth
- `apps/api/src/index.ts` — [SEC-08] rota `/debug-sentry` pública; [SEC-09] `/api/health` expondo `deadLetters`

Existing behavior:

- **[SEC-03]** `psychologist-page.tsx`: `state?.wsAuthToken ?? searchParams.get("token") ?? ""` — quando o usuário recarrega a página ou chega via link direto, o `wsAuthToken` é lido da query string, expondo o token no histórico do browser e logs de servidor.
- **[SEC-04]** `email.service.ts:23`: `console.warn(\`Link de redefinição para ${to}: ${resetUrl}\`)` — registra email e token de reset em plain text nos logs do servidor quando SMTP não está configurado.
- **[SEC-06]** `appointment.ts:132`: `console.error("Google OAuth exchange failed:", body)` — loga o body completo da resposta de erro do Google.
- **[SEC-08]** `index.ts`: `app.get("/debug-sentry", () => { throw new Error(...) })` — endpoint público que lança exceção intencionalmente; gera ruído no Sentry e expõe endpoint em produção.
- **[SEC-09]** `index.ts`: `/api/health` retorna `{ status, deadLetters }` onde `deadLetters` pode conter payloads de eventos com dados de pacientes.

## Requirements

### [SEC-03] Remover fallback de `wsAuthToken` via URL

Em `apps/web/src/features/consulta/psychologist-page.tsx`:

```diff
- const wsAuthToken = state?.wsAuthToken ?? searchParams.get("token") ?? "";
- const patientJoinUrl = state?.patientJoinUrl ?? searchParams.get("joinUrl") ?? undefined;
+ const wsAuthToken = state?.wsAuthToken ?? "";
+ const patientJoinUrl = state?.patientJoinUrl;
```

Adicionar guard: se `wsAuthToken` estiver vazio após a leitura do estado, redirecionar
para `/agendamento` com `navigate("/agendamento", { replace: true })` e retornar um
loading state enquanto redireciona, para evitar que a página de consulta renderize
sem autenticação WebSocket.

Remover `searchParams` do import se não for mais usado.

### [SEC-04] Sanitizar log de reset de senha

Em `apps/api/src/services/email.service.ts`:

```diff
- console.warn(`[email] SMTP não configurado. Link de redefinição para ${to}: ${resetUrl}`);
+ console.warn("[email] SMTP não configurado. E-mail de redefinição de senha não enviado.");
```

### [SEC-06] Sanitizar log de erro OAuth

Em `apps/api/src/routes/appointment.ts`, na linha do `console.error` do OAuth:

```diff
- const body = await response.text();
- console.error("Google OAuth exchange failed:", body);
+ console.error("Google OAuth exchange failed, status:", response.status);
```

Remover a variável `body` se não for mais utilizada.

### [SEC-08] Remover endpoint `/debug-sentry`

Em `apps/api/src/index.ts`, remover o bloco:

```diff
- app.get("/debug-sentry", () => {
-     throw new Error("Teste Sentry API");
- });
```

### [SEC-09] Sanitizar resposta do `/api/health`

Em `apps/api/src/index.ts`, alterar o handler de health para não expor os payloads:

```diff
  app.get("/api/health", (c) => {
      const deadLetters = eventBus.getDeadLetters();
      const healthy = deadLetters.length === 0;
      return c.json(
-         { status: healthy ? "ok" : "degraded", deadLetters },
+         { status: healthy ? "ok" : "degraded", deadLetterCount: deadLetters.length },
          healthy ? 200 : 503
      );
  });
```

## Constraints

- Não alterar lógica de negócio ou fluxo de vídeo além do tratado aqui.
- A remoção do fallback de URL (SEC-03) não pode quebrar o fluxo normal de
  navegação para a consulta — apenas o caso de recarga direta por URL.
- Não criar dependências novas.
- Não tocar em arquivos não listados.

## Acceptance Criteria

- `wsAuthToken` não aparece em nenhuma URL do browser na página `/consulta/:id`.
- Recarregar `/consulta/:id` sem estado de navegação redireciona para `/agendamento`.
- `console.warn` em `email.service.ts` não contém email nem URL.
- `console.error` de OAuth não contém body da resposta do Google.
- `GET /debug-sentry` retorna 404.
- `GET /api/health` retorna `{ status, deadLetterCount }` sem array de payloads.
- `bun run build` passa sem erros de tipo.

## Suggested Verification

```bash
bun run build

# SEC-03: acessar /consulta/:id via navegação normal (deve funcionar)
# SEC-03: recarregar /consulta/:id — deve redirecionar para /agendamento

# SEC-08: curl http://localhost:3001/debug-sentry — deve retornar 404

# SEC-09: curl http://localhost:3001/api/health
# Resposta esperada: {"status":"ok","deadLetterCount":0}
```
