# Task: Pagamentos — contas a receber por paciente (MVP)

Status: review — branch `feat/pagamentos`, atrás da flag `pagamentos`
(`ai/tasks/task-feature-flags.md`).

## Goal

Responder "quem me deve, quanto e de quais sessões": cada sessão concluída vira uma cobrança;
registrar o pagamento quita cobranças e cria a receita no Financeiro.

## Context

- Paciente: `valorSessao`, `modeloCobranca`, `formaPagamento`, `responsavelFinanceiro*`
  (`apps/web/src/features/pacientes/components/patient-form.tsx`).
- Agendamento: `status` `pending|confirmed|cancelled|completed`, projeções em
  `apps/api/src/cqrs/appointment/appointment.projections.ts`.
- Financeiro é o livro-caixa (`financial_transaction`).
- Referências de produto: SimplePractice/Jane (cobrança por atendimento, saldo, extrato),
  Psicomanager/iClinic (sessões a receber, recibo, WhatsApp), Receita Saúde (recibo oficial).

## Decisões (defaults, revisar com o beta)

- A cobrança nasce quando a sessão fica **concluída** e some (se ainda aberta) quando deixa de
  estar concluída ou é excluída. Cobrança paga nunca é apagada.
- Uma cobrança por sessão, no valor de `valorSessao`; sem valor no cadastro, não gera.
- Vencimento: `sessao_avulsa` → dia da sessão; `mensal` → dia 10 do mês seguinte.
- Falta não é cobrada. Sem pacotes. Sem gateway: Pix copia-e-cola estático gerado no web a
  partir de `user.pixKey`.
- Onde fica: aba "A receber" no Financeiro (`/pagamentos` redireciona) e aba "Financeiro" no
  detalhe do paciente.

## Requirements

- Tabelas `charge` e `payment`, `user.pixKey`, `patient.modeloCobranca` editável no cadastro.
- Router `billing` (flag `pagamentos`): `summary`, `receivables`, `patientStatement`,
  `registerPayment` (transação: cria receita paga no Financeiro, payment e quita cobranças),
  `waiveCharge` (abonar).
- Web: KPIs, tabela por paciente, sheet de registrar pagamento, cobrar no WhatsApp com Pix,
  extrato do paciente com recibo para imprimir, chave Pix no perfil.

## Seed

`apps/api/src/db/seed.ts` (`seedBilling`): liga a flag `pagamentos` para a conta principal e as
colegas, preenche `pixKey` com o e-mail quando vazio, cria as cobranças das sessões concluídas
que ainda não têm (inclusive de seeds antigos), registra pagamentos das sessões com mais de 7
dias em ~70% dos pacientes e abona uma cobrança. Bancos de dev precisam de `bun run db:migrate`
antes (migration `0023`), senão o login quebra por falta da coluna `user.pix_key`.

## Ajustes antes do beta (feitos)

- Desfazer pagamento (`billing.undoPayment`, botão no extrato do paciente): reabre as
  cobranças, apaga o pagamento e a receita. A receita gerada por pagamento não pode ser apagada
  nem ter valor/tipo/situação/paciente alterados no Financeiro.
- `psychologist.exportData` inclui cobranças e pagamentos.
- CPF (cifrado) e endereço profissional no perfil ("Dados para recibos"), impressos no
  recibo; aviso ao imprimir recibo sem CPF. Migration `0024`.
- Pendente: testar o Pix copia-e-cola num app de banco; CNPJ/razão social para quem atende
  como PJ; nome profissional/social; assinatura digital nos documentos.
- Cobrança automática: `ai/tasks/task-cobranca-automatica-whatsapp.md`.

## Follow-ups (fora do MVP)

- Pacotes, cobrança de falta, lembrete antes do vencimento, gateway (Asaas/Mercado Pago),
  relatório para Carnê-Leão, selo de pagamento no card da agenda.

## Acceptance Criteria

- Concluir sessão → aparece em A receber; registrar pagamento → some de A receber e vira receita.
- Outra psicóloga não vê nem quita cobranças alheias; flag desligada → `FORBIDDEN`.
- Testes de integração e E2E cobrindo o fluxo.

## Suggested Verification

```bash
bun run test && bun run test:integration && bun run test:e2e
bun run --filter @psy-manager/web lint && bun run build:web && bun run build:api
```
