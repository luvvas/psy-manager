# 🛠️ Progresso do Projeto — Estágios de Desenvolvimento

Cada estágio tem **seu próprio arquivo** com o passo a passo completo (contexto,
comandos, bugs, e as notas "O Que Cai na SAA-C03"). Esta página é o índice
navegável: estágio → status → arquivos-chave → documento detalhado.

> Legenda: ✅ concluído · 📋 planejado
>
> Os arquivos de estágio foram migrados do antigo `step-by-step.md` (aposentado).
> O número no título de cada arquivo é o do estágio; o cabeçalho interno ainda
> traz o número da seção original do diário.

## Linha do tempo (estágios)

| # | Estágio | Status | Arquivos-chave | Documento |
|---|---|:--:|---|---|
| 00 | **Base: EC2 + Docker + Compose** | ✅ | `docker-compose.prod.yml`, `docker/Dockerfile.api`, `scripts/deploy.sh` | [00-base-infra.md](00-base-infra.md) |
| 01 | **Banco gerenciado: RDS PostgreSQL** | ✅ | `.env` (`DATABASE_URL`), `docker-compose.prod.yml` | [01-rds.md](01-rds.md) |
| 02 | **Desacoplamento / Stateless** | ✅ | `docker-compose.prod.yml` | [02-stateless.md](02-stateless.md) |
| 03 | **Frontend global: S3 + CloudFront** | ✅ | `.github/workflows/deploy-ec2.yml` (`deploy-frontend`), `apps/web/` | [03-s3-cloudfront.md](03-s3-cloudfront.md) |
| 04 | **Segredos: SSM Parameter Store + IAM Role** | ✅ | `scripts/deploy.sh` | [04-ssm-secrets.md](04-ssm-secrets.md) |
| 05 | **Monitoramento: CloudWatch + SNS** | ✅ | (console AWS) | [ficha](../saa-c03/servicos/cloudwatch.md) |
| 06 | **SPA / remoção do Nginx** | ✅ | `docker-compose.prod.yml` (sem `web`) | [05-spa-nginx.md](05-spa-nginx.md) |
| 07 | **Documentos privados: S3 Presigned URLs** | ✅ | `apps/api/src/routes/` (storage), `apps/api/src/db/schema.ts` | [06-documents-presigned.md](06-documents-presigned.md) |
| 08 | **Cache CloudFront / fix de MIME type** | ✅ | `.github/workflows/deploy-ec2.yml` (sync assets/shell) | [07-cloudfront-cache.md](07-cloudfront-cache.md) |
| 09 | **Videochamada: WebRTC + WebSocket** | ✅ | `apps/api/src/ws/{rooms,signaling}.ts`, `apps/api/src/routes/video-session.ts`, `apps/web/src/features/consulta/` | [08-webrtc.md](08-webrtc.md) |
| 10 | **Cache: Redis / ElastiCache** | ✅ | `apps/api/src/lib/cache.ts`, `apps/api/src/lib/auth.ts`, `apps/api/src/routes/patient.ts`, `docker-compose*.yml` | [09-redis.md](09-redis.md) |
| 11 | **CI/CD seguro: IAM OIDC Federation** | ✅ | `.github/workflows/deploy-ec2.yml` (`permissions: id-token`) | [10-oidc.md](10-oidc.md) |
| 12 | **Event-driven: EventBridge + Lambda** | ✅ | `apps/lambda/reminder-sender/index.ts`, `reminder-scheduler.service.ts` | [11-eventbridge-lambda.md](11-eventbridge-lambda.md) |
| 13 | **Estratégia de rotação de chaves** | ✅ | `ai/tasks/task-key-rotation.md` | [12-key-rotation.md](12-key-rotation.md) |
| 14 | **Deploy sem SSH: SSM Session Manager** | ✅ | `scripts/deploy.sh`, `.github/workflows/deploy-ec2.yml` | [13-ssm-session-manager.md](13-ssm-session-manager.md) |
| 15 | **Build Once: ECR + Trivy** | ✅ | `.github/workflows/deploy-ec2.yml`, `docker-compose.prod.yml`, `scripts/deploy.sh`, `.trivyignore`, `scripts/ecr-lifecycle-policy.json`, `package.json` | [14-ecr-build-once.md](14-ecr-build-once.md) |
| 16 | **Domínio próprio: Route 53 + ACM** | 📋 | — | [ROADMAP #12](../ROADMAP.md) |
| 17 | **Escala horizontal: ASG + ALB** | 📋 | `ai/tasks/task-alb-auto-scaling.md` | [ROADMAP #13](../ROADMAP.md) |
| 18 | **VPC avançada: subnets privadas + NAT** | 📋 | — | [ROADMAP #14](../ROADMAP.md) |

## Referência cruzada

- 🛠️ [Troubleshooting](troubleshooting.md) — problemas comuns e soluções (não é um estágio; é referência geral).

## Estágios concluídos por categoria

- **Infra de base**: 00, 01, 02, 06
- **Frontend / entrega**: 03, 08
- **Segurança / CI-CD**: 04, 11, 13, 14, 15
- **Features de produto**: 07, 09
- **Performance / observabilidade**: 05, 10

## Como adicionar um novo estágio

1. Crie `docs/progress/NN-nome.md` (use o padrão: contexto → passos → bugs → "O Que Cai na SAA-C03").
2. Adicione uma linha nesta tabela.
3. Se gerou aprendizado de certificação, mapeie no domínio correspondente em [saa-c03/](../saa-c03/README.md).
4. Atualize o status no [ROADMAP.md](../ROADMAP.md).
