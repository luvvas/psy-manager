# Task: Go-to-Market — Checklist pra Onboarding de Psicólogos (Beta)

Status: blocked — depende de decisão de produto (nome do app)

> Atualizada em 2026-11-03 para o setup VPS + Cloudflare. Route 53/ACM, SES e o
> lembrete por WhatsApp via Lambda saíram junto com a AWS.

## Goal

Destravar o que falta pra trazer mais psicólogos pro beta. O sistema **já está em
produção**; isto é go-to-market, não feature. Quase tudo depende de uma decisão:
**o nome do app**.

```
NOME DO APP  (decisão de produto)
│
├─► Domínio definitivo (Cloudflare) ──┬─► E-mail de suporte (@dominio)
│                                     ├─► SMTP from-address + SPF/DKIM/DMARC
│                                     └─► URL do formulário de beta
│
└─► Formulário de beta  ──► precisa de nome + URL + e-mail de suporte
```

## Checklist (em ordem de dependência)

### 0. Decidir o nome do app 🔑
- [ ] Escolher o nome definitivo
- [ ] Verificar domínio (`.com.br` / `.com`) e conflito de marca antes de fechar

### 1. Domínio
O app já roda em `app.<dominio>` via Tunnel (domínio da migração; ver
`docs/progress/15-saida-aws-cloudflare.md`, passo 1).
- [ ] Se o domínio definitivo for outro: registrar (Cloudflare Registrar = preço de
      custo), adicionar à Cloudflare, nova rota pública no Tunnel, e trocar
      `BETTER_AUTH_URL`, `PUBLIC_URL`, `ALLOWED_ORIGINS`, `GOOGLE_REDIRECT_URI` no
      `PROD_ENV_FILE`, o CORS do bucket R2 e a URI autorizada no Google Cloud
- [ ] Redirecionar o domínio antigo (Redirect Rule) por um tempo
- TLS é automático na Cloudflare; não há certificado para emitir.

### 2. E-mail de suporte
- [ ] `suporte@dominio` via **Cloudflare Email Routing** (grátis, só recebe e encaminha)
- Responder "como" o domínio exige um provedor de envio (passo 3).

### 3. SMTP
- [ ] Trocar `SMTP_FROM` no `PROD_ENV_FILE` para `contato@dominio`
- [ ] SPF, DKIM e DMARC no DNS da Cloudflare, conforme o provedor SMTP
- [ ] Testar entregabilidade (Gmail/Outlook) com o fluxo de redefinir senha

### 4. Formulário de beta
- [ ] Criar o form com nome, URL e e-mail de suporte (rascunho em
      `docs/go-to-market/beta-form.md`)
- [ ] Perguntas de triagem (CRP, especialidade, volume de pacientes)

### 5. Renomear `psy-manager` no que é user-facing
- [ ] Títulos de página, `index.html`, e-mails, landing, termos e política de privacidade
- [ ] **Manter** nomes internos (pacotes do workspace, imagens no GHCR, buckets) —
      renomear não é user-facing e gera churn de infra

### Fora do escopo (decidir à parte)
- **Lembrete por WhatsApp:** o código (Lambda + EventBridge) foi removido na saída da
  AWS; as colunas `appointment.reminder*` continuam no banco. Voltar exige desenho
  novo (agendador dentro da API) + conta Meta Business verificada + número dedicado +
  template aprovado. Se for prioridade do beta, abrir uma task própria.

## Constraints

- Texto user-facing em pt-BR.
- Preferir opções grátis/baratas.
- Não expor segredos; valores só no `PROD_ENV_FILE`.

## Definition of Done

- [ ] App acessível pelo domínio definitivo com HTTPS.
- [ ] E-mails saem de endereço profissional e não caem em spam.
- [ ] Formulário de beta compartilhável.
- [ ] `psy-manager` não aparece em nada user-facing.

## Relacionado

- `docs/go-to-market/` — plano de release e rascunho do formulário
- `docs/progress/15-saida-aws-cloudflare.md` — setup atual de domínio/Tunnel
