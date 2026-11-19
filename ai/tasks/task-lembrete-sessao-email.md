# Task: Agendador de tarefas e lembrete de sessão por e-mail

Status: ready

## Goal

O paciente recebe um e-mail antes da sessão (antecedência escolhida pela psicóloga), sem ela
fazer nada. O agendador criado aqui é a base para os lembretes por WhatsApp
(`task-cobranca-automatica-whatsapp.md`) e para o envio recorrente de instrumentos
(`task-instrumentos-recorrentes.md`).

## Context

- `appointment.reminderEnabled`, `reminderMinutesBefore`, `reminderSentAt` existem no schema
  e a API ainda os aceita; a UI os esconde. Nada envia lembrete desde a saída da AWS
  (`ai/memory/current-state.md`).
- `apps/api/src/services/email.service.ts` — nodemailer com `SMTP_*`; hoje só redefinição de senha.
- `patient.email` (opcional) e PII criptografada: decriptar só no envio.
- Escrita de agendamento passa pelo CQRS (`apps/api/src/cqrs/appointment/`); marcar
  `reminderSentAt` também.
- Produção: uma VPS, Docker Compose, uma réplica da API (`ai/context/deployment.md`).

## Requirements

- Agendador dentro do processo da API: laço a cada minuto que pega os agendamentos com
  lembrete ligado, `reminderSentAt` nulo e início dentro da janela; protegido por
  `pg_try_advisory_lock` para não rodar em dobro se um dia houver duas réplicas.
- Envio idempotente: marca `reminderSentAt` pelo comando CQRS; uma falha de SMTP não marca
  e tenta de novo no próximo ciclo, até o início da sessão.
- Paciente sem e-mail é pulado sem erro.
- E-mail sem dado clínico: nome da psicóloga, data, hora, modalidade (link da teleconsulta
  se houver). Nada de diagnóstico ou observação.
- UI: devolver o campo "Lembrete" ao formulário de agendamento e uma preferência padrão por
  psicóloga.
- Configuração de domínio de envio documentada em `ai/context/deployment.md` (SPF, DKIM e
  DMARC no DNS da Cloudflare).

## Constraints

- Sem serviço pago novo; usa o SMTP já configurado.
- Sem comentários no código. Texto em pt-BR.

## Acceptance Criteria

- Teste de integração: lembrete sai uma vez só, respeita a janela, pula paciente sem e-mail,
  não marca quando o envio falha, e o lock impede execução dupla.
- Agendamento cancelado ou remarcado não recebe lembrete do horário antigo.

## Suggested Verification

```bash
bun run test:api
bun run test:integration
bun run test:e2e
```
