# KMS (Key Management Service)

**O que é:** gestão de chaves criptográficas. Encripta/decripta via API; você nunca vê a chave.

**Quando é a resposta certa:** criptografia em repouso, rotação de chave **sem re-encriptar dados**, controle de acesso a chave via IAM.

## Pontos-chave
- **Rotação automática anual** do material — a Key ID (lógica) não muda; o KMS guarda versões antigas pra decriptar ciphertexts antigos.
- `kms:Encrypt` / `kms:Decrypt` via API; integra com S3 (SSE-KMS), RDS, EBS, SSM SecureString.
- **AWS-managed key** (`alias/aws/ssm`) grátis vs **Customer-managed key** (~$1/mês, mais controle).
- **Envelope encryption**: KMS encripta a *data key*, que encripta os dados.

## Pegadinhas
- "Rotacionar chave sem re-encriptar TB de dados" → **KMS** (vs rotacionar chave bruta = re-encriptar tudo, arriscado).
- SSM `SecureString` é encriptado com KMS — a Role precisa de `kms:Decrypt` (ou usar a chave padrão coberta por `AmazonSSMReadOnlyAccess`).

## Como usamos no Psy-Manager
- Plano: substituir `ENCRYPTION_KEY` bruta por KMS → [§18](../../progress/12-key-rotation.md) · [ROADMAP #11](../../ROADMAP.md)
- SSM SecureString já usa KMS por baixo → [§10](../../progress/04-ssm-secrets.md)
