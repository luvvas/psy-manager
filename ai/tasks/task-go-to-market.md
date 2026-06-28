# Task: Go-to-Market — Checklist pra Onboarding de Psicólogos (Beta)

Status: blocked — depende de decisão de produto (nome do app)

## Goal

Destravar os itens que faltam pra trazer mais psicólogos pro beta. O sistema **já
está em produção e funcionando**; isto aqui é go-to-market, não desenvolvimento de
feature. Quase tudo está amarrado a uma única decisão: **o nome do app**.

## Keystone: o NOME do app

O nome `psy-manager` é provisório e vai ser trocado. Enquanto o nome final não
existe, os itens abaixo ficam travados. **Decidir o nome destrava 4 dos 5.**

```
NOME DO APP  (decisão de produto)
│
├─► Domínio (Route 53)  ──┬─► E-mail de suporte (@dominio)
│                         ├─► SMTP from-address (@dominio) + SPF/DKIM/DMARC (DNS)
│                         └─► URL pro formulário de beta
│
├─► WhatsApp Business  ──► nome no template + número dedicado (chip novo)
│
└─► Formulário de beta (Google)  ──► precisa de nome + URL + e-mail de suporte
```

## Checklist (em ordem de dependência)

### 0. Decidir o nome do app 🔑
- [ ] Escolher o nome definitivo (decisão de produto)
- [ ] Verificar disponibilidade do domínio (`.com.br` / `.com`) antes de fechar o nome
- [ ] Verificar se o nome não conflita com marca existente

### 1. Domínio — Route 53 + ACM
- [ ] Registrar o domínio no Route 53 (~R$40/ano)
- [ ] Criar hosted zone ($0.50/mês)
- [ ] Emitir certificado no ACM **em us-east-1** (grátis; us-east-1 é obrigatório pro CloudFront)
- [ ] Apontar o CloudFront pro domínio customizado (alternate domain name + cert)
- **Custo**: ~$0.50/mês + domínio. ACM grátis. (Ver ROADMAP #12.)

### 2. E-mail de suporte do app
- [ ] Criar `suporte@dominio` (ou `contato@`)
- [ ] Opção free-tier: **Zoho Mail** (free com domínio próprio) ou **encaminhamento** — evitar Google Workspace pago
- **Por quê**: a verificação Meta Business pede e-mail/site do negócio; o SMTP precisa de um from-address; o formulário de beta precisa de um contato.

### 3. SMTP (já configurado — só ajustar)
- [ ] Trocar `SMTP_FROM` pro novo `contato@dominio` (SMTP_HOST/USER/PASS já estão no SSM)
- [ ] Adicionar registros **SPF, DKIM e DMARC** no Route 53 (entregabilidade — não cair em spam)
- **Nota**: avaliar AWS SES (free tier de envio) se quiser trocar o provedor SMTP atual.

### 4. WhatsApp Business (código pronto — falta setup externo)
- [ ] Conseguir **número dedicado** (chip novo; não pode estar logado no WhatsApp comum)
- [ ] Criar conta Meta Business + **verificar o negócio** (1–3 dias úteis — começar cedo!)
- [ ] Criar/submeter o template `appointment_reminder` com o nome do app (~24h de aprovação)
- [ ] Deploy do Lambda + IAM roles + EventBridge schedule group (lado AWS — ver `task-whatsapp-reminder.md`)
- **Bloqueio**: verificação Meta é externa e lenta — iniciar em paralelo assim que o nome existir.

### 5. Formulário de beta (Google Forms)
- [ ] Criar o form com o nome do app, a URL (domínio próprio) e o e-mail de suporte
- [ ] Perguntas de triagem (CRP, especialidade, volume de pacientes, etc.)

### 6. Renomear `psy-manager` no código (depende do nome)
- [ ] Trocar nas strings **user-facing**: títulos de página, `VITE_*`, nome no e-mail, nome no template WhatsApp, app desktop (electron-builder)
- [ ] **Manter** os nomes de recursos AWS internos (`psy-manager-api`, buckets, roles) — renomear isso é disruptivo e não é user-facing

## Constraints

- Manter texto user-facing em pt-BR.
- Preferir opções free-tier/baratas (coerente com a reversão de RDS/ElastiCache por custo).
- Não trocar nomes de recursos AWS internos só por causa do rebrand (evita churn de infra).
- Não expor segredos do `.env`.

## Definition of Done

- [ ] Psicólogo consegue acessar o app por um **domínio próprio com HTTPS**.
- [ ] Recebe e-mails do app de um **endereço profissional** que não cai em spam.
- [ ] Lembretes de WhatsApp funcionam **de verdade** (Meta aprovado, Lambda no ar).
- [ ] Existe um **formulário de beta** compartilhável.
- [ ] O nome `psy-manager` não aparece mais em nada **user-facing**.

## Relacionado

- `ai/tasks/task-whatsapp-reminder.md` — código + passos AWS/Meta do WhatsApp
- `docs/ROADMAP.md` #12 — Route 53 + ACM
- `docs/saa-c03/servicos/{s3,cloudfront,ssm}.md` — contexto de DNS/CDN/segredos
