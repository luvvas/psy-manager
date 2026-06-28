# EventBridge

**O que é:** barramento de eventos + agendador serverless. Dispara o Lambda de lembretes no horário certo.

**Quando é a resposta certa:** "executar em horário específico" (Scheduler) ou "reagir a um evento" (Rules), de forma desacoplada e serverless.

## Pontos-chave
- **Scheduler** (agenda no tempo): `rate()`, `cron()`, `at()` (disparo único). `ActionAfterCompletion: DELETE` auto-limpa.
- **Rules** (reage a eventos): pattern matching sobre eventos de serviços AWS.
- **PassRole**: o criador do schedule passa a role que o EventBridge usa pra invocar o target.
- Desacoplamento **temporal**: o produtor registra a intenção e não espera.
- Free tier generoso (Scheduler: 14M invocações/mês).

## Pegadinhas
- **Scheduler ≠ Rules**: "horário específico" → Scheduler; "quando acontecer X" → Rules.
- Sem `iam:PassRole`, criar schedule com target falha.
- "Tarefa agendada com menor custo" → EventBridge + Lambda, não cron em EC2 sempre ligada.

## Como usamos no Psy-Manager
- Schedule `at()` de uso único → invoca Lambda de lembrete → [§17](../../progress/11-eventbridge-lambda.md)
