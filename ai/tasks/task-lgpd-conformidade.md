# Task: Conformidade LGPD — Privacidade por Design

Status: draft

## Goal

Adequar o psy-manager à Lei Geral de Proteção de Dados (LGPD), cobrindo as cinco
lacunas identificadas em auditoria técnica: ausência de documentação legal,
configuração insegura do Sentry, ausência de fluxo de exclusão de dados pelo
titular e ausência de links legais acessíveis na landing page.

## Context

Relevant files:

- `apps/web/src/main.tsx` — inicialização do Sentry (frontend), sem `sendDefaultPii: false`
- `apps/api/src/instrument.ts` — inicialização do Sentry (backend), sem `sendDefaultPii: false`
- `apps/web/src/pages/landing.tsx` — footer da landing page; não tem links para documentos legais
- `apps/web/src/router.tsx` — rotas públicas; adicionar `/politica-de-privacidade` e `/termos-de-uso`
- `apps/web/src/components/layout/profile-form.tsx` — formulário de perfil; adicionar exclusão de conta
- `apps/api/src/lib/auth.ts` — Better Auth; expõe `deleteUser` se habilitado
- `apps/api/src/db/schema.ts` — schema; confirmar `onDelete: "cascade"` em todas as FKs do usuário
- `apps/api/src/routes/psychologist.ts` — rota de perfil; adicionar endpoint de exclusão

Existing behavior:

- Sentry inicializa com `sendDefaultPii` ausente (padrão pode vazar headers/cookies).
- O footer da landing exibe apenas tagline — sem links para política de privacidade ou termos.
- Não existe UI nem endpoint para que o usuário exclua sua própria conta.
- As tabelas `patient`, `document`, `financial_transaction`, etc. referenciam `psychologist_id` com `onDelete: "cascade"`, mas isso precisa ser verificado para todas as tabelas.

## Requirements

### [LGPD-01] Documentos Legais — Política de Privacidade e Termos de Uso

- Criar `apps/web/src/pages/privacy-policy.tsx` — página estática com o conteúdo
  da Política de Privacidade em pt-BR, cobrindo:
  - Dados coletados (nome, e-mail, dados clínicos dos pacientes do psicólogo).
  - Finalidade do tratamento e bases legais (Art. 7º LGPD — legítimo interesse, obrigação contratual, consentimento).
  - Retenção de dados: dados de conta mantidos enquanto a conta estiver ativa; dados excluídos em até 30 dias após exclusão de conta.
  - Direitos do titular: acesso, correção, portabilidade, exclusão (via painel ou e-mail de contato).
  - Contato do responsável (DPO): e-mail de contato listado na página.
  - Uso de cookies: apenas cookies de sessão estritamente necessários (Better Auth) e de monitoramento de erros (Sentry, sem dados pessoais).
- Criar `apps/web/src/pages/terms-of-use.tsx` — página estática com Termos de Uso
  em pt-BR cobrindo: uso aceitável, responsabilidade do psicólogo pelos dados dos
  seus pacientes, limitação de responsabilidade da plataforma.
- Registrar ambas as rotas **públicas** em `apps/web/src/router.tsx`:
  - `/politica-de-privacidade`
  - `/termos-de-uso`
- Atualizar o footer de `apps/web/src/pages/landing.tsx` para incluir links para
  ambas as páginas.
- Adicionar links para as páginas no formulário de cadastro (`apps/web/src/features/auth/page.tsx`),
  no padrão "Ao criar sua conta, você concorda com os [Termos de Uso] e a [Política de Privacidade]."

### [LGPD-04] Hardening do Sentry — Privacy by Design

- Em `apps/web/src/main.tsx`, adicionar ao `Sentry.init`:
  - `sendDefaultPii: false`
  - `beforeSend(event)` que remove de `event.request.headers` as chaves
    `cookie`, `authorization`, `x-auth-token` (e quaisquer chaves que contenham
    `password`, `token`, `auth` no nome) antes de enviar o evento.
- Em `apps/api/src/instrument.ts`, aplicar as mesmas configurações:
  - `sendDefaultPii: false`
  - `beforeSend(event)` com o mesmo filtro de headers sensíveis.

### [LGPD-05] Exclusão de Conta em Cascata (DSR — Direito ao Esquecimento)

#### Backend

- Verificar em `apps/api/src/db/schema.ts` que **todas** as tabelas com FK para
  `user.id` possuem `onDelete: "cascade"`. Tabelas a verificar:
  - `patient`, `document`, `clinical_record`, `financial_transaction`,
    `appointment`, `clinic_member`, `video_session`, `feedback`.
  - Adicionar `{ onDelete: "cascade" }` nas FKs que estiverem faltando e gerar
    migração Drizzle.
- Criar procedure tRPC `psychologist.deleteAccount` (mutation, autenticada):
  - Confirma que o usuário autenticado existe.
  - Deleta a conta via `auth.api.deleteUser` do Better Auth **ou** diretamente
    via `db.delete(user).where(eq(user.id, userId))` — o cascade cuida das
    tabelas dependentes.
  - Retorna `{ success: true }`.

#### Frontend

- Em `apps/web/src/components/layout/profile-form.tsx`, adicionar seção "Zona de
  Perigo" ao final do formulário com:
  - Botão "Excluir minha conta" (variante destrutiva).
  - Ao clicar: abre `<AlertDialog>` de confirmação com texto explícito sobre
    irreversibilidade e lista do que será apagado (conta, pacientes, prontuários,
    documentos, transações financeiras, agendamentos).
  - Após confirmação: chama `psychologist.deleteAccount`, faz logout e redireciona
    para `/`.

## Constraints

- Manter todo texto voltado ao usuário em pt-BR.
- Seguir os padrões visuais existentes (shadcn/ui, Tailwind).
- Não introduzir dependências externas novas além do que já existe no projeto.
- Não alterar lógica de negócio não relacionada à conformidade.
- Não expor segredos de `.env`.
- O conteúdo jurídico das páginas de Política e Termos deve ser revisado por
  profissional jurídico antes de publicar em produção — a task entrega a
  estrutura e o rascunho técnico.

## Acceptance Criteria

- `GET /politica-de-privacidade` e `GET /termos-de-uso` retornam páginas
  renderizadas com conteúdo em pt-BR, acessíveis sem autenticação.
- O footer da landing exibe links funcionais para ambos os documentos.
- O formulário de cadastro exibe o aviso de concordância com links.
- `Sentry.init` em `main.tsx` e `instrument.ts` possui `sendDefaultPii: false`
  e `beforeSend` filtrando headers sensíveis.
- Usuário autenticado consegue acionar "Excluir minha conta" no perfil, confirmar
  e ter todos os seus dados removidos do banco.
- Após exclusão, a sessão é encerrada e o usuário é redirecionado para `/`.
- `bun run build` passa sem erros de tipo.
- Todas as FKs para `user.id` possuem `onDelete: "cascade"` (verificar com
  `bun run db:generate` sem diff pendente após a revisão).

## Suggested Verification

```bash
bun run build

# Verificar páginas legais
# Navegar para /politica-de-privacidade e /termos-de-uso — devem renderizar

# Verificar Sentry
# Inspecionar main.tsx e instrument.ts — sendDefaultPii: false deve estar presente

# Verificar exclusão de conta
# Criar conta de teste, cadastrar um paciente e um documento
# Acessar Perfil > Zona de Perigo > Excluir minha conta
# Confirmar e verificar que o usuário foi redirecionado para /
# Verificar no banco que nenhum registro com o psychologistId permanece
```
