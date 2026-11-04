# Task: Cobrança automática pelo WhatsApp (API oficial da Meta)

Status: draft — depende de decisões e de cadastro na Meta (ver "Antes de implementar").

## Goal

O sistema envia sozinho, pelo WhatsApp, lembretes das cobranças em aberto (antes do
vencimento, no dia e depois de vencida), com valor e Pix, sem a psicóloga abrir o WhatsApp.
Hoje o botão "Cobrar no WhatsApp" só abre um link `wa.me` com a mensagem pronta.

## Context

- Cobranças: `charge` / `payment`, `apps/api/src/services/billing.service.ts`, flag `pagamentos`
  (`ai/tasks/task-pagamentos-mvp.md`).
- Mensagem e Pix atuais: `apps/web/src/components/billing/charge-message.ts`,
  `apps/web/src/utils/pix.ts` (BR Code estático a partir de `user.pixKey`).
- Lembretes antigos de agendamento (EventBridge + Lambda) saíram com a saída da AWS; as colunas
  `appointment.reminder*` ficaram. Não há agendador de tarefas na VPS hoje.
- Produção: uma VPS com Docker Compose (`ai/context/deployment.md`), orçamento apertado.
- Dados de saúde: a mensagem é PII e indica relação terapêutica (LGPD, sigilo profissional).

## Decisões (recomendadas)

- **API oficial**: WhatsApp Cloud API da Meta, direto (sem intermediário). Integrações não
  oficiais (Z-API, Evolution, Baileys) estão fora: risco de banimento do número e de dados de
  saúde por canal sem garantia.
- **Um número do psy-manager** enviando em nome da psicóloga. Número por psicóloga (uma conta
  WhatsApp Business por pessoa) fica para depois.
- **Categoria utility** (lembrete de pagamento ligado a um serviço já prestado). Texto
  promocional faz a Meta reclassificar o modelo como marketing, que é bem mais caro.
- **Conteúdo mínimo**: primeiro nome do paciente, nome da psicóloga, valor, vencimento e Pix.
  Sem "psicoterapia", sem datas de sessão, sem dados clínicos.
- **Envio só com opt-in** registrado do paciente (exigência da política da Meta e base legal
  da LGPD), com saída por resposta "PARAR".

## Antes de implementar (conferir na documentação oficial da Meta)

- [ ] Preço atual por mensagem utility para destinatário brasileiro. Desde 01/07/2025 a cobrança
  é por mensagem; as fontes de terceiros divergem (≈ US$ 0,007 a R$ 0,08). A Meta anunciou
  tabela e cobrança em BRL para o Brasil em 2026. Fazer a conta com o volume esperado.
- [ ] Como levar o Pix: o botão "copiar código" aparece como exclusivo de modelos de
  marketing/autenticação, não de utility. Opções: copia-e-cola numa variável do corpo, ou botão
  de URL para uma página pública de pagamento (token, como o link da teleconsulta). Confirmar
  limites de tamanho de variável e o que a Meta aprova.
- [ ] Recursos de pagamento com Pix da própria plataforma no Brasil (mensagem de pedido/cobrança
  com Pix), se existirem e servirem para pessoa física.
- [ ] Regras de opt-in e de janela de atendimento (respostas dentro da janela de 24 h com
  modelo utility podem ser grátis).
- [ ] Cadastro: Business Manager verificado, número dedicado, nome de exibição aprovado,
  modelos aprovados em pt-BR.

## Requirements

### Configuração

- Por psicóloga: liga/desliga a cobrança automática e escolhe os lembretes
  (padrão: 2 dias antes, no dia, 3 dias depois; no máximo 3 por cobrança).
- Por paciente: `whatsappOptInAt`, `whatsappOptOutAt` e telefone válido (E.164). Sem opt-in,
  nada é enviado. Registrar de onde veio o opt-in (cadastro, mensagem do paciente).
- Nova flag `cobranca-whatsapp`, desligada por padrão, além da flag `pagamentos`.

### Envio

- Agendador diário dentro da própria API (job com trava no Postgres para não rodar duas vezes;
  ou serviço `worker` no compose), em horário comercial de São Paulo.
- Tabela `charge_reminder` (`chargeId`, `kind` before/due/after, `status`
  queued/sent/delivered/read/failed, `waMessageId`, `error`, timestamps), com índice único em
  (`chargeId`, `kind`) para nunca repetir.
- Cliente da Cloud API (`fetch` para a Graph API) com o token em variável de ambiente; nada de
  segredo em `VITE_*`. Erros e limites da Meta registrados no lembrete, sem derrubar o job.
- Cobrança paga, abonada ou desfeita depois de agendada não recebe lembrete.

### Webhook

- `POST /api/whatsapp/webhook`, com verificação do desafio e da assinatura do corpo.
  Atualiza o status das mensagens (entregue, lida, falhou) e registra o opt-out quando o paciente
  responde "PARAR".

### Interface

- Perfil: configuração da cobrança automática.
- Paciente (aba Contrato): opt-in do WhatsApp.
- Extrato do paciente: histórico de lembretes por cobrança ("lembrete enviado em 03/11, lido").

## Constraints

- Keep user-facing text in pt-BR.
- Follow existing patterns in nearby files.
- Do not read or expose `.env` secrets; novos segredos entram no `.env.example` só com o nome.
- Sem comentários no código.
- Isolamento: lembretes e configurações filtrados por `psychologistId`.

## Acceptance Criteria

- Com opt-in e flag ligada, uma cobrança em aberto recebe os lembretes configurados, uma vez
  cada, e o status de entrega aparece no extrato.
- Sem opt-in, com opt-out, cobrança paga/abonada ou flag desligada: nenhum envio.
- Testes de integração com a Graph API simulada por stub de `fetch`: agendamento, idempotência,
  opt-out pelo webhook, assinatura inválida recusada, isolamento entre psicólogas.
- `ai/context/deployment.md` e `.env.example` documentam as novas variáveis e o job.

## Fora do escopo

- Baixa automática do pagamento (Pix dinâmico com aviso do intermediador: Asaas, Mercado Pago,
  Efí). É a próxima etapa e completa o ciclo; a cobrança automática continua precisando de
  "Registrar pagamento" manual.
- Número de WhatsApp por psicóloga.

## Suggested Verification

```bash
bun run test:integration
bun run test:e2e
```

Manual: número de teste da Meta enviando para o telefone de quem testa, com um modelo aprovado.
