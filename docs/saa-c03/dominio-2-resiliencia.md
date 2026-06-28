# Domínio 2 — Design Resilient Architectures (26%)

Foca em: alta disponibilidade, tolerância a falhas, desacoplamento e recuperação.

## Conceitos-chave

- **Separar camadas**: aplicação (EC2) ≠ dados (RDS) ≠ estado (Redis) ≠ estáticos (S3). Cada uma falha e escala de forma independente.
- **Stateless**: a instância de compute não deve guardar estado local — assim qualquer instância serve qualquer requisição (pré-requisito pra escala horizontal).
- **Estado em memória é armadilha**: qualquer `Map`/cache local quebra com 2+ instâncias. Solução: **ElastiCache (Redis)** ou DynamoDB.
- **RDS Multi-AZ**: réplica síncrona em outra AZ pra failover automático (HA). Diferente de **Read Replica** (assíncrona, pra escalar leitura).
- **Backups automáticos** e snapshots do RDS.
- **Desacoplamento temporal** (event-driven): o produtor não espera o consumidor. EventBridge/SQS/SNS desacoplam no tempo.
- **Health checks**: ALB/ASG removem instâncias não-saudáveis automaticamente.
- **SPA fallback**: Custom Error Responses 403/404 → `/index.html` (resiliência de roteamento client-side).

## Como o projeto exercita

| Tema | Onde foi feito | Seção |
|---|---|---|
| RDS gerenciado (separar dados de compute) | migração do Postgres do Docker pro RDS | [§6](../progress/01-rds.md) |
| EC2 stateless | remoção do `db` local; secrets injetados em runtime | [§7](../progress/02-stateless.md) |
| Estado em memória → Redis (sessões compartilhadas) | `lib/cache.ts`, `secondaryStorage` no Better Auth | [§15](../progress/09-redis.md) |
| Armadilha de estado em memória (salas WebSocket) | `ws/rooms.ts` (só funciona com 1 instância) | [§14](../progress/08-webrtc.md) |
| Desacoplamento temporal (lembretes) | EventBridge Scheduler + Lambda | [§17](../progress/11-eventbridge-lambda.md) |
| Degradação graciosa (Redis cai → vai no RDS) | `try/catch` em todas as funções de cache | [§15](../progress/09-redis.md) |
| ASG + ALB (planejado) | `task-alb-auto-scaling.md` | [ROADMAP #13](../ROADMAP.md) |

## Pegadinhas comuns da prova

- "Se eu adicionar um segundo servidor, o que quebra?" → **qualquer estado em memória local** (sessões, mapas, cache). Resposta: mover pra ElastiCache/DynamoDB.
- **Multi-AZ ≠ Read Replica**: Multi-AZ = disponibilidade (failover); Read Replica = performance de leitura. A prova mistura os dois de propósito.
- "App precisa continuar funcionando se o cache cair" → **degradação graciosa** (cache opcional, fallback no banco).
- Sessões "presas" numa instância atrás de ALB → falta **store de sessão compartilhado** (Redis) ou sticky sessions (pior).
- EventBridge **Scheduler** (agenda no tempo) ≠ EventBridge **Rules** (reage a eventos/pattern).
