# 🗺️ Roadmap — Psy-Manager

Roadmap canônico do projeto (substitui o antigo `next-step.md` na raiz).
Cada item concluído linka pro documento detalhado do estágio em [progress/](progress/README.md).

> Status: ✅ concluído · 📋 planejado

## ✅ Concluído

| # | Item | Custo | Detalhe |
|---|---|---|---|
| 1 | Frontend global: S3 + CloudFront | $0 (free tier) | [§9](progress/03-s3-cloudfront.md) |
| 2 | Banco gerenciado: RDS PostgreSQL | $0 (free tier) | [§6](progress/01-rds.md) |
| 3 | Segredos: SSM Parameter Store + IAM Role | $0 | [§10](progress/04-ssm-secrets.md) |
| 4 | Monitoramento: CloudWatch + SNS | $0 | — |
| 5 | IAM OIDC Federation (CI/CD sem chaves) | $0 | [§16](progress/10-oidc.md) |
| 6 | Event-driven: EventBridge Scheduler + Lambda | $0 (free tier) | [§17](progress/11-eventbridge-lambda.md) |
| 7 | Estratégia de rotação de chaves | $0 | [§18](progress/12-key-rotation.md) |
| 8 | Deploy sem SSH: SSM Session Manager | $0 | [§19](progress/13-ssm-session-manager.md) |
| 9 | Build Once: ECR + Trivy | ~$0 (centavos de storage) | [§20](progress/14-ecr-build-once.md) |

## 📋 Próximos passos (SAA-C03)

### 10. AWS Secrets Manager — auto-rotação do banco
Migrar `POSTGRES_PASSWORD` do SSM para o Secrets Manager e habilitar o rotator
nativo do RDS (rotação a cada 30 dias sem downtime). Exemplo canônico de
auto-rotação cobrado na prova.
- **Domínio**: [Segurança](saa-c03/dominio-1-seguranca.md) · **Custo**: ~$0.40/mês

### 11. AWS KMS para `ENCRYPTION_KEY`
Substituir a chave AES-256 bruta por chamadas à KMS API (`Encrypt`/`Decrypt`).
O KMS gerencia o material e rotaciona anualmente sem re-encriptar dados.
- **Domínio**: [Segurança](saa-c03/dominio-1-seguranca.md) · **Custo**: ~$1/chave/mês

### 12. Domínio personalizado: Route 53 + ACM
Trocar `dswfc48bg9ft6.cloudfront.net` por um domínio real. Route 53 (DNS) + ACM
(certificado TLS grátis, **obrigatoriamente em us-east-1** pro CloudFront).
- **Domínio**: [Performance](saa-c03/dominio-3-performance.md) · **Custo**: ~$0.50/mês + domínio

### 13. Escala horizontal: Auto Scaling Group + ALB
ALB na frente do EC2 + ASG escalando por CPU. Depende do Redis (estágio 10) pra
sessões compartilhadas. Ver `ai/tasks/task-alb-auto-scaling.md`.
- **Domínio**: [Resiliência](saa-c03/dominio-2-resiliencia.md) · **Custo**: ALB ~$16/mês

### 14. VPC avançada: subnets privadas + NAT Gateway
EC2 em subnet privada (sem IP público), ALB na pública, NAT Gateway pra saída.
- **Domínio**: [Segurança](saa-c03/dominio-1-seguranca.md) · **Custo**: NAT ~$32/mês (estudar o conceito)

---

### Nota técnica — Google Drive sync
`fs.watch` só observa arquivos locais. Funciona com Google Drive for Desktop
sincronizando uma pasta local, mas não é arquitetura ideal pra produção. Pra algo
robusto: Google Drive API com `changes.watch` + webhook HTTPS, depois
`changes.list` com page token no RDS, copiando pro S3 via worker/Lambda/SQS.
