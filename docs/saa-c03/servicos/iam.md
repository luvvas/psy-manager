# IAM (Identity and Access Management)

**O que é:** controle de quem pode fazer o quê na AWS. Roles, policies, federação.

**Quando é a resposta certa:** qualquer pergunta de "acesso", "permissão", "credencial", "menor privilégio".

## Pontos-chave
- **Role vs User**: Role = credencial **temporária** (workloads); User = permanente (evitar pra automação).
- **Policy = Effect + Action + Resource** (+ Condition). Restrinja o `Resource` ao ARN específico.
- **OIDC Federation**: `AssumeRoleWithWebIdentity` troca um JWT (GitHub) por credenciais temporárias. Trust policy com condição `sub`/`aud`.
- **Instance Profile**: Role anexada à EC2; credenciais via IMDSv2.
- **PassRole**: necessário quando o serviço A configura o B pra usar a Role C.
- **Inline policy** (grudada numa role) vs **Managed policy** (reutilizável; AWS-managed têm ARN `aws:policy/...`).

## Pegadinhas
- Algumas ações exigem `Resource: "*"` (ex.: `ssm:GetCommandInvocation`, `ecr:GetAuthorizationToken`) — não é descuido.
- Sem condição `sub` na trust policy OIDC, **qualquer repo** poderia assumir a role.
- `AssumeRole` (mesma conta) ≠ `AssumeRoleWithWebIdentity` (OIDC) ≠ `AssumeRoleWithSAML`.

## Como usamos no Psy-Manager
- OIDC GitHub→AWS (sem chave) → [§16](../../progress/10-oidc.md)
- Roles separadas: push (GitHub) vs pull (EC2) no ECR → [§20](../../progress/14-ecr-build-once.md)
