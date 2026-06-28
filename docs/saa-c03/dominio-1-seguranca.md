# Domínio 1 — Design Secure Architectures (30%)

O maior peso da prova. Foca em: controle de acesso (IAM), criptografia (em repouso
e em trânsito), rede segura e gestão de segredos.

## Conceitos-chave

- **IAM Role vs IAM User**: roles emitem credenciais **temporárias**; users têm credenciais **permanentes**. Para qualquer workload (EC2, Lambda, ECS, CI/CD) → **sempre Role**.
- **Princípio do menor privilégio**: conceda só a ação e o recurso (ARN) necessários. Use condições (`StringEquals`, etc.) para restringir ainda mais.
- **Menor privilégio no tempo**: credenciais de curta duração (OIDC, Instance Profile, STS) > credenciais permanentes — limitam a janela de exposição.
- **OIDC Federation**: provedor de identidade externo (GitHub) federa identidade na AWS via `AssumeRoleWithWebIdentity`. Sem chave estática armazenada.
- **IMDSv2 (Instance Metadata Service)**: como o SDK na EC2 obtém credenciais da Instance Role sem chaves no disco.
- **SSM Parameter Store `SecureString`** vs `String`: segredos criptografados com KMS vs config em texto plano.
- **Secrets Manager vs Parameter Store**: Secrets Manager tem **auto-rotação** (rotator nativo pro RDS); Parameter Store é grátis mas sem rotação automática.
- **KMS**: criptografa/decripta via API; rotaciona o material **sem re-encriptar dados**; você nunca vê a chave.
- **Security Group com fonte = outro Security Group**: vínculo dinâmico entre recursos (EC2↔RDS, EC2↔Redis) em vez de CIDR fixo — resiliente a mudança de IP.
- **S3 privado + OAC (Origin Access Control)**: só o CloudFront lê o bucket; acesso direto retorna *Access Denied*.
- **Presigned URLs**: delegam temporariamente uma permissão que a aplicação já tem (upload/download direto no S3 sem passar pela API).

## Como o projeto exercita

| Tema | Onde foi feito | Seção |
|---|---|---|
| OIDC (CI/CD sem chave estática) | `deploy-ec2.yml` `permissions: id-token` | [§16](../progress/10-oidc.md) |
| IAM Role na EC2 (sem access key no disco) | Instance Profile + IMDSv2 | [§10](../progress/04-ssm-secrets.md) |
| `SecureString` no SSM | `scripts/deploy.sh` (`--with-decryption`) | [§10](../progress/04-ssm-secrets.md) |
| Presigned URLs (S3 privado) | rota de documentos da API | [§12](../progress/06-documents-presigned.md) |
| SG como fonte de SG | RDS SG e Redis SG aceitam o SG da EC2 | [§6](../progress/01-rds.md) · [§15](../progress/09-redis.md) |
| S3 privado + OAC | bucket do frontend | [§9](../progress/03-s3-cloudfront.md) |
| SSM Session Manager (sem porta 22) | `scripts/deploy.sh` via SSM | [§19](../progress/13-ssm-session-manager.md) |
| Least privilege em policy (ECR push só num repo) | policy `psy-manager-ecr-push` | [§20](../progress/14-ecr-build-once.md) |
| Estratégia de rotação / KMS | auditoria de segredos | [§18](../progress/12-key-rotation.md) |

## Pegadinhas comuns da prova

- "Workload externa precisa assumir role sem armazenar credenciais" → **OIDC Provider + AssumeRoleWithWebIdentity** (não access key).
- "Rotacionar credencial de banco automaticamente sem downtime" → **Secrets Manager** (não Parameter Store, não KMS).
- "Eliminar chave SSH e porta 22" → **SSM Session Manager**.
- "Rotacionar chave de criptografia sem re-encriptar TB de dados" → **KMS** (mantém versões antigas do material).
- `ssm:GetCommandInvocation` exige `Resource: "*"` — o ID do comando é dinâmico. Não é descuido, é a API.
- Certificado do **CloudFront** tem que estar em **us-east-1** (ACM) — independente da região do resto.
- OAC (novo) substitui o OAI (legado) para acesso CloudFront→S3.
