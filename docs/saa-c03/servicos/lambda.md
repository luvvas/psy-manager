# Lambda

**O que é:** função serverless — roda código sob demanda, sem servidor pra gerenciar. Envia os lembretes de WhatsApp.

**Quando é a resposta certa:** tarefa pontual/event-driven, tráfego irregular, "menor custo entre execuções". Não para processo always-on.

## Pontos-chave
- Escala automática por invocação; **custo zero entre invocações**.
- Free tier: 1M invocações/mês perpétuo.
- Target de event-driven (EventBridge, S3 events, SQS).
- **Cold start**: VPC adiciona latência — só coloque em VPC se precisar acessar recurso privado (RDS).

## Pegadinhas
- "Cron na EC2 vs ?" → Lambda + EventBridge é mais barato e sem infra.
- Lambda sem VPC **não acessa RDS privado** — mas evita cold start. Tradeoff de design.
- Timeout máx 15 min — tarefa longa → Fargate/EC2.

## Como usamos no Psy-Manager
- `reminder-sender` chama a Meta WhatsApp API, sem acesso ao banco (dados vêm no payload) → [§17](../../progress/11-eventbridge-lambda.md)
