# 🗂️ Fichas Rápidas por Serviço — SAA-C03

Fichas curtas pra revisão (especialmente na reta final / entre simulados). Cada uma
segue o mesmo formato: **o que é · quando é a resposta certa · pontos-chave ·
pegadinhas · como usamos no projeto**.

> Para estudo por tema, veja os [domínios do exame](../README.md). Estas fichas são
> o corte transversal "por serviço".

## Computação & Containers
- [EC2](ec2.md) — instâncias, Instance Profile, IMDSv2
- [Lambda](lambda.md) — serverless, event-driven
- [ECR](ecr.md) — registry de imagens, digest, scan

## Rede & Entrega
- [CloudFront](cloudfront.md) — CDN, behaviors, OAC
- [S3](s3.md) — object storage, estáticos, presigned URLs

## Banco & Cache
- [RDS](rds.md) — Postgres gerenciado, Multi-AZ vs Read Replica
- [ElastiCache](elasticache.md) — Redis, cache-aside, sessões

## Segurança & Gestão
- [IAM](iam.md) — roles, policies, OIDC, least privilege
- [KMS](kms.md) — criptografia gerenciada, rotação
- [SSM](ssm.md) — Parameter Store, Session Manager, Run Command
- [Secrets Manager](secrets-manager.md) — segredos com auto-rotação

## Integração & Observabilidade
- [EventBridge](eventbridge.md) — Scheduler vs Rules
- [CloudWatch](cloudwatch.md) — métricas, alarmes, logs

---

Template pra criar uma ficha nova: [`_template.md`](_template.md).
