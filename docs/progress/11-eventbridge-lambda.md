> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 17. ⚡ Arquitetura Event-Driven: EventBridge Scheduler + Lambda

Esta seção documenta a implementação do sistema de lembretes automáticos via WhatsApp — o primeiro uso de arquitetura event-driven no projeto.

### A. O Problema

O psicólogo precisava que pacientes recebessem uma mensagem WhatsApp automática X minutos antes da consulta. As opções eram:

1. **Cron job na EC2**: simples, mas depende da instância estar de pé e acorda a cada minuto desnecessariamente.
2. **SQS + polling**: mais robusto, mas requer worker rodando continuamente.
3. **EventBridge Scheduler + Lambda**: disparo único no momento exato, sem infraestrutura contínua, serverless.

Escolhemos a opção 3 para aprender serviços AWS relevantes para a SAA-C03.

### B. Arquitetura

```
API (EC2)
  │
  │  1. Psicólogo salva agendamento com reminderEnabled=true
  │     e reminderMinutesBefore=60
  │
  ▼
EventBridge Scheduler
  │  Schedule: at(2026-06-20T13:00:00)   ← UTC, calculado como horário da consulta - 60min
  │  ActionAfterCompletion: DELETE        ← schedule se auto-deleta após disparar
  │
  │  2. No horário calculado, dispara o Lambda
  ▼
Lambda (psy-manager-reminder-sender)
  │  Payload: { patientName, patientPhone, psychologistName, date, time }
  │
  │  3. Chama Meta WhatsApp Business Cloud API (Graph API v19.0)
  │  4. POST /api/internal/reminder-callback com X-Callback-Secret
  ▼
API stampa appointment.reminderSentAt no banco
```

### C. IAM: Duas Roles, Responsabilidades Separadas

**Role 1: EC2 → EventBridge Scheduler**

A EC2 (que roda a API) precisa criar e deletar schedules:

```json
{
  "Effect": "Allow",
  "Action": [
    "scheduler:CreateSchedule",
    "scheduler:DeleteSchedule",
    "iam:PassRole"
  ],
  "Resource": [
    "arn:aws:scheduler:sa-east-1:ACCOUNT:schedule/psy-manager-reminders/*",
    "arn:aws:iam::ACCOUNT:role/psy-manager-scheduler-role"
  ]
}
```

`iam:PassRole` é necessário porque ao criar o schedule, a API passa para o EventBridge a role que ele deve usar para invocar o Lambda. Sem `PassRole`, essa passagem é bloqueada.

**Role 2: EventBridge Scheduler → Lambda**

O EventBridge precisa de permissão para invocar a função Lambda:

```json
{
  "Effect": "Allow",
  "Action": "lambda:InvokeFunction",
  "Resource": "arn:aws:lambda:sa-east-1:ACCOUNT:function:psy-manager-reminder-sender"
}
```

Trust policy desta role tem `scheduler.amazonaws.com` como principal — o EventBridge assume essa role no momento do disparo.

### D. Schedules de Uso Único (One-Time)

O EventBridge Scheduler suporta três tipos de expressão:

| Tipo | Sintaxe | Uso |
|---|---|---|
| Rate | `rate(1 hour)` | Recorrente com intervalo fixo |
| Cron | `cron(0 12 * * ? *)` | Recorrente com expressão cron |
| **At** | `at(yyyy-MM-ddTHH:mm:ss)` | **Disparo único no momento exato** |

Usamos `at()` com `ActionAfterCompletion: DELETE` — o schedule se auto-deleta após disparar, sem deixar resíduos.

```typescript
// reminder-scheduler.service.ts
const scheduleTime = new Date(
    `${date}T${startTime}:00-03:00`  // UTC-3 = Brasil
);
scheduleTime.setMinutes(scheduleTime.getMinutes() - reminderMinutesBefore);

const expression = `at(${scheduleTime.toISOString().slice(0, 19)})`;
// Resultado: "at(2026-06-20T13:00:00)"
```

### E. Lambda: Node.js 20.x Sem Acesso ao Banco

Uma decisão arquitetural importante: o Lambda **não acessa o banco de dados**. Todos os dados necessários (nome do paciente, telefone, nome do psicólogo, data, hora) são passados no payload do schedule no momento da criação.

Isso evita:
- Configurar VPC no Lambda (que adiciona ~100ms de cold start).
- Dar ao Lambda acesso ao RDS (surface de ataque maior).
- Dependência de conectividade VPC para uma função que só precisa chamar APIs externas.

O tradeoff: se o paciente atualizar o telefone entre o agendamento e o lembrete, o número no payload pode estar desatualizado. Para este caso de uso (lembretes ~24h de antecedência), aceitável.

### F. O Que Cai na SAA-C03

- **EventBridge Scheduler vs EventBridge Rules**: Rules reagem a eventos (pattern matching). Scheduler agenda disparos no tempo (rate, cron, at). Para "executar em horário específico", sempre EventBridge Scheduler.
- **Lambda como target de event-driven**: Lambda não roda continuamente — acorda apenas quando invocado, executa, termina. Sem custo de infraestrutura entre invocações.
- **IAM PassRole**: permissão necessária sempre que um serviço A configura outro serviço B para usar uma role C. Sem PassRole, o B não pode assumir C.
- **Decoupling**: a API não sabe quando o Lambda vai executar. Ela apenas registra a intenção (create schedule). Isso é desacoplamento temporal — um dos benefícios centrais de arquiteturas event-driven.
- **Serverless vs Always-on**: cron job na EC2 consome CPU/RAM 24/7 para disparar uma vez por agendamento. Lambda + EventBridge consome zero entre disparos.

---

