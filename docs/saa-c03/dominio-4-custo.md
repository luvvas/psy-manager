# Domínio 4 — Design Cost-Optimized Architectures (20%)

Foca em: escolher a opção mais barata que atende o requisito — sem over-provisionar.

## Conceitos-chave

- **Serverless vs always-on**: Lambda/EventBridge custam **zero entre invocações**; um cron na EC2 paga CPU/RAM 24/7 pra rodar de vez em quando.
- **S3 para estáticos vs EC2**: pagar RAM de EC2 só pra entregar arquivo estático é desperdício — S3 entrega "infinito" e barato.
- **Free Tier consciente**: `t3.micro`/`t4g.micro`, RDS `db.t3.micro` 20 GB, desligar storage autoscaling pra não estourar.
- **Right-sizing**: escolher o menor tipo de instância que aguenta a carga (e usar SWAP no `t3.micro` pra compilar TS).
- **Parameter Store (grátis) vs Secrets Manager ($0.40/secret/mês)**: use o pago só quando precisa de auto-rotação.
- **Lifecycle policies**: expirar imagens velhas no ECR / objetos no S3 pra não pagar storage acumulado.
- **NAT Gateway é caro** (~$32/mês + $/GB): saber o conceito, mas avaliar alternativas (NAT instance, VPC endpoints) em ambientes de custo sensível.
- **Custo de transferência de dados**: CloudFront tem 1 TB/mês grátis perpétuo; egress direto do EC2/S3 pode custar.

## Como o projeto exercita

| Decisão | Economia | Seção |
|---|---|---|
| Frontend no S3+CloudFront (não EC2) | libera RAM da `t3.micro`; CDN grátis até 1 TB | [§9](../progress/03-s3-cloudfront.md) · [§11](../progress/05-spa-nginx.md) |
| Lembretes via Lambda+EventBridge (não cron na EC2) | zero custo entre disparos | [§17](../progress/11-eventbridge-lambda.md) |
| `t3.micro` + SWAP de 2 GB | fica no free tier mesmo compilando TS | [§2](../progress/00-base-infra.md) |
| SSM Parameter Store (não Secrets Manager) | $0 enquanto não precisa de auto-rotação | [§10](../progress/04-ssm-secrets.md) · [§18](../progress/12-key-rotation.md) |
| ECR lifecycle policy (10 imagens / untagged 7d) | não acumula storage de imagens velhas | [§20](../progress/14-ecr-build-once.md) |
| WebRTC P2P (não servidor de mídia pago) | evita custo por minuto (Twilio/Daily) | [§14](../progress/08-webrtc.md) |

## Pegadinhas comuns da prova

- "Tarefa periódica/agendada com menor custo" → **Lambda + EventBridge** (não instância sempre ligada).
- "Servir site estático com menor custo e escala" → **S3 + CloudFront** (não EC2/ASG).
- "Reduzir custo de storage de logs/imagens/objetos antigos" → **Lifecycle policy** (expira/transiciona).
- Secrets Manager **custa** por secret — se não precisa de rotação automática, **Parameter Store** resolve de graça.
- NAT Gateway aparece como "instâncias privadas precisam de saída pra internet" — é a resposta, mas a prova de custo pode pedir **VPC Gateway Endpoint** (S3/DynamoDB) pra evitar o NAT.
- Desligar **storage autoscaling** do RDS pra não sair do free tier sem perceber.
