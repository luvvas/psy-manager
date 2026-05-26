# Task: Rate Limiting em Endpoints de Autenticação

Status: draft

## Goal

Proteger os endpoints de autenticação contra brute force e abuso adicionando rate
limiting no servidor Hono. Sem isso, `sign-in`, `forgot-password` e a API tRPC em
geral estão sem proteção contra tentativas automatizadas.

## Context

Relevant files:

- `apps/api/src/index.ts` — servidor principal Hono; aqui são registrados os middlewares
- `apps/api/package.json` — dependências do backend

Existing behavior:

- Nenhum middleware de rate limiting está configurado.
- `POST /api/auth/sign-in` — aceita tentativas ilimitadas de login.
- `POST /api/auth/forgot-password` — pode ser usado para bombardear emails.
- `POST /trpc/*` — mutations sem limite de requisições.

## Requirements

### Instalar dependência

```bash
bun add --filter @psy-manager/api hono-rate-limiter
```

> `hono-rate-limiter` é leve, não requer Redis para uso com MemoryStore (adequado
> para instância única EC2 como a atual). Se no futuro escalar horizontalmente,
> trocar pelo `RedisStore`.

### Configurar rate limiting em `apps/api/src/index.ts`

Adicionar três camadas de rate limiting **antes** dos handlers de rota, usando IP
como chave (via `c.req.header("x-forwarded-for") ?? c.req.header("cf-connecting-ip") ?? "unknown"`):

1. **Auth geral** (`/api/auth/*`): 30 requisições por 15 minutos por IP.
2. **Sign-in específico** (`/api/auth/sign-in`): 10 tentativas por 15 minutos por IP.
   — Janela mais restrita para proteger contra brute force de senha.
3. **Forgot password** (`/api/auth/forgot-password`): 5 requisições por hora por IP.
   — Previne bomba de emails de reset.

Estrutura sugerida no `index.ts` (antes dos handlers de rota existentes):

```typescript
import { rateLimiter } from "hono-rate-limiter";

const authRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    keyGenerator: (c) =>
        c.req.header("cf-connecting-ip") ??
        c.req.header("x-forwarded-for") ??
        "unknown",
    standardHeaders: "draft-6",
    message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
});

const signInRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    keyGenerator: (c) =>
        c.req.header("cf-connecting-ip") ??
        c.req.header("x-forwarded-for") ??
        "unknown",
    standardHeaders: "draft-6",
    message: "Muitas tentativas de login. Aguarde 15 minutos.",
});

const forgotPasswordRateLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    keyGenerator: (c) =>
        c.req.header("cf-connecting-ip") ??
        c.req.header("x-forwarded-for") ??
        "unknown",
    standardHeaders: "draft-6",
    message: "Limite de solicitações de redefinição atingido. Aguarde 1 hora.",
});

// Aplicar antes dos handlers
app.use("/api/auth/sign-in", signInRateLimiter);
app.use("/api/auth/forgot-password", forgotPasswordRateLimiter);
app.use("/api/auth/*", authRateLimiter);
```

> O Hono avalia middlewares na ordem de registro — o `signInRateLimiter` precisa
> estar registrado **antes** do `authRateLimiter` para que ambos sejam aplicados
> corretamente ao path `/api/auth/sign-in`.

### Resposta de rate limit excedido

- Deve retornar HTTP `429 Too Many Requests`.
- O corpo da resposta deve ser legível pelo cliente (mensagem em pt-BR).
- O `beforeSend` do Sentry não deve capturar erros 429 como exceção — verificar
  se o Sentry está configurado para ignorar respostas 4xx (é o comportamento padrão).

## Constraints

- Usar `MemoryStore` (padrão da lib) para a instância EC2 atual.
- Não adicionar Redis nem outras dependências de infraestrutura.
- Não limitar o endpoint `/api/health` nem rotas de assets.
- Manter o comportamento de CORS existente — rate limiting deve ser aplicado
  **depois** do middleware CORS para que respostas 429 incluam os headers CORS
  corretos (necessário para o cliente React interpretar o erro).
- Mensagens de erro em pt-BR.

## Acceptance Criteria

- `POST /api/auth/sign-in` com 11 tentativas em sequência retorna 429 na 11ª.
- `POST /api/auth/forgot-password` com 6 tentativas retorna 429 na 6ª.
- Requests normais abaixo do limite continuam funcionando sem degradação.
- `bun run build` passa sem erros de tipo.

## Suggested Verification

```bash
bun run build
bun run dev:api

# Testar brute force de login (requer curl ou script)
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3001/api/auth/sign-in \
    -H "Content-Type: application/json" \
    -d '{"email":"x@x.com","password":"wrong"}'
done
# Esperado: 200/400 nas primeiras 10, 429 a partir da 11ª
```
