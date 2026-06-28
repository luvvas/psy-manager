# Plano de Lançamento (Release Plan)

> 📌 _Salvo de uma conversa anterior pra não perder. Conteúdo estratégico do produto._
>
> ⚠️ _Nota de realidade: a tabela "AWS Free Tier" abaixo lista RDS e ElastiCache no
> custo projetado — eles foram **revertidos por custo**. Hoje a infra é Postgres em
> container + sem Redis (ver `docs/progress/` e a seção "Capacidade da infra atual",
> que já reflete isso corretamente)._

---

### Contexto atual do produto

|Módulo|Status|
|---|---|
|Auth, Agenda, Pacientes, Prontuário, Financeiro, Documentos, Clínicas, Videochamada|Funcionando|
|Pagamentos, Exames, Buscar Psicólogos, Configurações|Placeholder|

O produto está funcional para o core de um consultório — mas ainda falta **monetização embutida**, o que é um bloqueador antes de cobrar.

---

### Fase 1 — Beta Fechado (2 a 4 semanas)

**Por que beta e não lançamento direto?**

Você tem módulos placeholder visíveis para o usuário. Um psicólogo que abrir "Pagamentos" e ver uma tela "em breve" vai questionar a maturidade do produto. Beta fechado te permite controlar quem acessa e coletar feedback antes que isso vire reputação negativa.

**Como executar:**

- Recrute 15–30 psicólogos via rede pessoal, grupos do CFP, grupos do WhatsApp/Telegram de psicólogos, LinkedIn
- Crie um formulário de interesse simples (Google Forms) e libere por convite manual
- Abra um canal de feedback exclusivo (grupo do WhatsApp ou Discord) — psicólogos costumam preferir WhatsApp
- Durante o beta, o app fica **100% gratuito**, sem data de cobrança
- Anuncie desde o início: _"está em beta, quando lançar pagos você terá X meses grátis/desconto"_

**O que monitorar:**

- Quais módulos são mais usados (Sentry + logs)
- Onde o fluxo quebra ou confunde
- O que está faltando que eles precisariam para substituir o que usam hoje

---

### Fase 2 — Beta Aberto + Preparar Monetização (4 a 8 semanas)

Nesse período, paralelamente ao uso, você precisa resolver:

**1. Cobrar sem um módulo de Pagamentos nativo**

Antes de implementar pagamento embutido no app, use uma solução de prateleira:

- **Stripe** — funciona no Brasil, aceita cartão, tem portal de clientes pronto
- **Hotmart / Kirvano** — muito usados no mercado B2C brasileiro, mas funcionam para SaaS simples
- **Mercado Pago** — familiar para brasileiros, PIX nativo

A estratégia mais rápida: Stripe com link de checkout externo. O usuário assina pelo Stripe, você verifica manualmente (ou via webhook) e libera o acesso. Depois você integra mais profundamente.

**2. Precificação para psicólogos brasileiros**

Psicólogos são profissionais liberais com renda estável. Ferramentas similares no Brasil cobram:

|Produto|Preço|
|---|---|
|Psicofácil|R$59–99/mês|
|iClinic|R$89–149/mês|
|Nidus|R$49–79/mês|

Uma faixa entre **R$49 e R$89/mês** é realista para começar. Se for lançar, comece no menor valor e aumente depois — é muito mais difícil fazer o contrário.

---

### Fase 3 — Lançamento Pago

**O momento certo para cobrar** é quando você tiver:

- [ ]  Pelo menos 1 psicólogo usando o app como ferramenta principal (não só testando)
- [ ]  Módulo de pagamentos integrado (mesmo que via link externo)
- [ ]  Placeholder de "Pagamentos" no app removido ou substituído por algo que faça sentido
- [ ]  Onboarding que não precise da sua ajuda manual

**Aviso prévio para beta users**: comunique a transição para pago com **30–45 dias de antecedência**. Ofereça 2–3 meses grátis para quem esteve no beta — isso converte muito melhor do que desconto percentual.

---

### AWS Free Tier — O que fazer antes de acabar

Sua stack atual depois do free tier (12 meses da criação da conta):

| Recurso                         | Custo estimado/mês |
| ------------------------------- | ------------------ |
| EC2 t3.micro                    | ~$8–10             |
| RDS db.t4g.micro (20 GB)        | ~$15–20            |
| ElastiCache cache.t3.micro      | ~$13–15            |
| CloudFront + S3 (baixo tráfego) | ~$2–5              |
| **Total estimado**              | **~$38–50/mês**    |

Isso equivale a **R$200–260/mês** dependendo do câmbio. Com apenas **3–4 assinantes pagos** você cobre a infra. Não espere o free tier acabar para ter assinantes — planeje cobrar antes disso.

**Se o free tier acabar antes de ter receita:** considere usar [Railway](https://railway.app/) ou [Render](https://render.com/) temporariamente — ambos têm planos mais baratos para estágios iniciais, sem perder o que foi construído.

---

### Resumo da sequência recomendada

```
Hoje
 └─ Beta fechado (convite) — 15-30 psicólogos — 3 semanas
     └─ Feedback + correções + integrar pagamento externo (Stripe)
         └─ Beta aberto — waitlist pública — 4 semanas
             └─ Anunciar data de cobrança com 30 dias de antecedência
                 └─ Lançamento pago com desconto vitalício para beta users
```

A maior armadilha nesse tipo de produto é ficar adicionando feature e nunca lançar. O app já tem tudo que um psicólogo autônomo precisa para operar. O que falta agora é validação real com usuários — e isso só vem colocando nas mãos de pessoas.

## Capacidade da infra atual: EC2 t3.micro + S3 + CloudFront

### O que está rodando no EC2 agora

```
1 GB RAM total
├── Ubuntu OS                  ~200 MB
├── Docker daemon              ~80 MB
├── PostgreSQL 17 alpine       ~150–250 MB  (shared_buffers padrão = 128 MB)
├── API (Bun)                  ~100–200 MB
└── coturn (TURN server)       ~30 MB
                              ─────────────
RAM disponível p/ trabalho     ~100–300 MB  + 2 GB SWAP
```

**CloudFront + S3** são praticamente ilimitados para frontend estático — esse lado não é o gargalo.

---

### Quantos usuários suporta?

Para o perfil de uso de psicólogos (horário comercial, uso assíncrono, não é app de stream):

|Cenário|Usuários registrados|Simultâneos no pico|Experiência|
|---|---|---|---|
|Confortável|até ~300|10–15|Rápido|
|Ok|300–600|15–25|Aceitável|
|Começa a sofrer|600+|25+|Lento, swap ativado|

**Para um beta de 30–100 usuários: sobra de capacidade.** O CPU burstable do t3.micro aguenta bem picos curtos, e como não tem Redis agora, cada request autenticado vai ao PostgreSQL diretamente (~20–30ms por query), o que ainda é perfeitamente aceitável nessa escala.

---

### O único risco real: perda de dados

> ✅ _Atualização: o `pg_dump` diário pra S3 já está implementado e rodando (ver
> `go-to-market/README.md`). Resta só mudar o EBS "Delete on termination" para No._

Esse é o ponto que precisa de atenção antes de qualquer coisa.

Com o PostgreSQL no Docker volume do EC2:

|Evento|O que acontece com os dados|
|---|---|
|Container reinicia|Seguro (volume persiste)|
|EC2 para/reinicia|Seguro|
|EC2 encerrada (terminated)|**EBS deletado por padrão → dados perdidos**|
|Falha de hardware do disco|**Dados perdidos**|
|Você ou o CI/CD roda algo errado|**Sem rollback**|

Com RDS você tinha backups automáticos diários e point-in-time recovery. Agora não tem nada.

**Solução simples: pg_dump diário para o S3**

Adicione isso ao EC2 via cron. SSH na instância e rode:

```bash
crontab -e
```

Adicione essa linha (faz dump às 3h da manhã todos os dias):

```bash
0 3 * * * docker exec psy-manager-db pg_dump -U postgres psy_manager | gzip > /tmp/backup-$(date +\%Y\%m\%d).sql.gz && aws s3 cp /tmp/backup-$(date +\%Y\%m\%d).sql.gz s3://psy-manager-documents-lucas/db-backups/ && rm /tmp/backup-$(date +\%Y\%m\%d).sql.gz
```

O bucket de documentos já existe e a IAM Role do EC2 já tem acesso ao S3 — só precisa adicionar `s3:PutObject` para o prefixo `db-backups/` na policy. Isso te dá 30 dias de histórico de backup com custo próximo de zero (arquivos gzip de 1–5 MB cada).

---

### Também: confirme que o EBS não vai ser apagado

No console AWS, verifique o volume EBS da EC2:

```
EC2 > Instances > sua instância > Storage > Volume ID
EC2 > Volumes > selecionar o volume > Delete on termination
```

Se estiver como **"Yes"**, mude para **"No"**. Isso garante que o disco persiste mesmo se você encerrar a instância por acidente.

---

### Quando adicionar o RDS de volta?

Não precisa hoje. Adicione quando:

- Tiver **clientes pagantes** (dados deles têm obrigação contratual e legal)
- Atingir **100+ usuários ativos** e sentir lentidão
- Precisar de zero-downtime no deploy (RDS multi-AZ)

Para o beta, a infra atual está boa. Só resolva o backup antes de abrir para os primeiros usuários.
