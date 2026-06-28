# EC2 (Elastic Compute Cloud)

**O que é:** máquinas virtuais sob demanda. Roda a API (Bun) do projeto.

**Quando é a resposta certa:** carga que precisa de SO/controle total ou processo de longa duração. Pra estáticos → S3; pra tarefa pontual → Lambda.

## Pontos-chave
- **Instance Profile**: anexa uma IAM Role à instância → o SDK pega credenciais via **IMDSv2**, sem chave no disco.
- **Tipos** `t3.micro`/`t4g.micro` no free tier (1 vCPU, 1 GB RAM). `t4g` = ARM (Graviton), mais barato.
- **User data** roda na primeira boot. **EBS** é o disco (gp3 > gp2 em custo/perf).
- Stateless é pré-requisito pra escala horizontal (ASG + ALB).

## Pegadinhas
- 1 GB de RAM trava compilação de TS → **SWAP** resolve no free tier.
- "Acesso sem porta 22/SSH" → **SSM Session Manager**, não abrir SG.
- Credenciais na EC2 → **Instance Role**, nunca `AWS_ACCESS_KEY_ID` no disco.

## Como usamos no Psy-Manager
- API em `t3.micro` + SWAP de 2 GB → [§2](../../progress/00-base-infra.md)
- Instance Profile pra SSM/ECR/S3 → [§10](../../progress/04-ssm-secrets.md)
