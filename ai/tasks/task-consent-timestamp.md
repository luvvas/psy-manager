# Task: Registro de Consentimento no Cadastro (LGPD — Base Legal)

Status: draft

## Goal

Registrar no banco a data/hora exata em que o psicólogo concordou com os Termos
de Uso e Política de Privacidade durante o cadastro. Isso cria evidência auditável
da base legal de consentimento (LGPD Art. 7, I) para fins de comprovação perante
a ANPD.

## Context

Relevant files:

- `apps/api/src/db/schema.ts` — tabela `user`; adicionar `consentedAt` e `consentVersion`
- `apps/api/src/lib/auth.ts` — Better Auth; verificar se suporta hook `onSignUp` para salvar os campos
- `apps/web/src/features/auth/page.tsx` — formulário de cadastro; enviar `consentedAt` no momento do clique
- `apps/api/drizzle/` — migrations Drizzle geradas
- `apps/api/src/routes/psychologist.ts` — pode ser necessário para endpoint de update pós-signup se Better Auth não suportar campos adicionais no signup

Existing behavior:

- `user` table não possui campos de consentimento.
- O formulário de cadastro exibe o aviso de concordância ("Ao criar sua conta, você
  concorda com os Termos de Uso e a Política de Privacidade") mas não envia nem
  armazena quando isso ocorreu.
- Better Auth suporta `additionalFields` no usuário (`phone`, `crp`, `city` já
  usam esse mecanismo).

## Requirements

### 1. Schema — `apps/api/src/db/schema.ts`

Adicionar dois campos à tabela `user`:

```typescript
consentedAt: timestamp("consented_at"),       // null = conta criada antes desta feature
consentVersion: text("consent_version"),       // ex: "2025-05", versão dos documentos legais
```

### 2. Migração Drizzle

Após alterar o schema, rodar:

```bash
bun run db:generate
```

Verificar que a migration gerada apenas adiciona as duas colunas sem `NOT NULL` (sem
default value — contas antigas ficam com null, o que é intencional).

### 3. Better Auth — `apps/api/src/lib/auth.ts`

Registrar os dois campos como `additionalFields` para que o Better Auth os aceite
no payload de sign-up:

```typescript
user: {
    additionalFields: {
        phone: { type: "string", required: false },
        crp: { type: "string", required: false },
        city: { type: "string", required: false },
        consentedAt: { type: "string", required: false },   // ISO string
        consentVersion: { type: "string", required: false },
    },
},
```

> Better Auth converte o valor no adapter Drizzle. Enviar como ISO string e converter
> para `Date` no schema Drizzle é o padrão existente para `phone`/`crp`.

### 4. Frontend — `apps/web/src/features/auth/page.tsx`

No handler `handleRegister`, antes de chamar `signUp.email`, capturar o timestamp:

```typescript
const handleRegister = async (data: RegisterFormValues) => {
    const consentedAt = new Date().toISOString();
    const consentVersion = "2025-05"; // atualizar a cada revisão dos documentos

    const { error } = await signUp.email({
        ...data,
        consentedAt,
        consentVersion,
    } as any);
    ...
};
```

> A constante `consentVersion` deve ser atualizada manualmente sempre que os
> documentos legais forem revisados de forma material.

## Constraints

- Os campos `consentedAt` e `consentVersion` devem ser nullable — contas criadas
  antes desta feature não precisam ser migradas retroativamente.
- Não adicionar checkbox de "aceito os termos" ao formulário — o aviso textual
  existente ("Ao criar sua conta, você concorda...") já é suficiente como
  mecanismo de consentimento por ação (click-wrap).
- Não expor `consentedAt`/`consentVersion` em nenhuma resposta pública da API.
- A constante `consentVersion` no frontend deve seguir o formato `YYYY-MM` para
  facilitar auditoria temporal.

## Acceptance Criteria

- Após cadastro, a tabela `user` contém `consented_at` com o timestamp do momento
  do clique em "Criar Conta".
- Contas antigas têm `consented_at = null` (nenhuma migration retroativa).
- `bun run db:generate` gera uma migration válida com apenas `ALTER TABLE user ADD COLUMN`.
- `bun run build` passa sem erros de tipo.

## Suggested Verification

```bash
bun run db:generate
# Verificar o arquivo SQL gerado em apps/api/drizzle/
# Deve conter: ALTER TABLE "user" ADD COLUMN "consented_at" timestamp;
#              ALTER TABLE "user" ADD COLUMN "consent_version" text;

bun run build

# Criar uma nova conta pelo formulário de cadastro
# Verificar no banco:
# SELECT id, name, consented_at, consent_version FROM "user" ORDER BY created_at DESC LIMIT 1;
# Deve retornar consented_at com timestamp recente e consent_version = "2025-05"
```
