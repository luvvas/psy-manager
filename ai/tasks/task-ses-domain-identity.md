# Task: Migrar SES para identidade de domínio próprio

Status: draft

## Goal

Trocar o remetente de emails (reset de senha e futuros emails transacionais) de um
endereço pessoal verificado para um domínio próprio verificado no AWS SES, ficando
DMARC-compliant e com branding correto (`noreply@psy-manager.com.br`).

## Context

Relevant files:

- `apps/api/src/services/email.service.ts` — usa `SMTP_FROM` do env
- `.env.example` — contém as variáveis `SMTP_*`
- `apps/api/src/lib/auth.ts` — chama `emailService.sendPasswordReset`

Existing behavior:

- Emails de reset de senha são enviados via SES com identidade de email pessoal
  (`lmachado72@outlook.com`) configurada em `SMTP_FROM`.
- Funciona mas não tem branding e pode ser rejeitado por DMARC do outlook.com em
  alguns clientes de email.

## Requirements

1. No console AWS SES, criar uma **Domain identity** para o domínio registrado
   (ex: `psy-manager.com.br`).
2. Publicar os registros DNS de verificação DKIM no registrador do domínio.
3. Aguardar status `Verified` no SES (geralmente minutos).
4. Atualizar `SMTP_FROM` no SSM Parameter Store de produção para
   `"psy-manager <noreply@psy-manager.com.br>"` (ou subdomínio preferido).
5. Se desejar DMARC completo, adicionar registro `_dmarc` no DNS do domínio.
6. Opcional: habilitar **custom MAIL FROM domain** no SES para alinhamento total.

## Constraints

- Keep user-facing text in pt-BR.
- Não alterar código — a mudança é só de configuração de infra e variável de env.
- Não expor credenciais SMTP no código ou nos commits.
- O `SMTP_FROM` deve usar um endereço do domínio verificado, caso contrário o SES
  rejeita o envio.

## Acceptance Criteria

- Identidade de domínio aparece como `Verified` no console SES.
- Email de reset de senha chega com remetente `noreply@psy-manager.com.br` (ou
  endereço escolhido).
- Nenhum erro DKIM/DMARC nos headers do email recebido (verificar via
  `Show original` no Gmail).
- `bun run build` continua passando sem alterações de código.

## Suggested Verification

```bash
# Nenhuma mudança de código necessária.
# Testar manualmente após atualizar SMTP_FROM no SSM:
# 1. Abrir /login no app de produção
# 2. Clicar "Esqueci minha senha" e submeter um email cadastrado
# 3. Verificar recebimento e headers do email
bun run build
```
