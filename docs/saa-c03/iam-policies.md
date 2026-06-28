# IAM — Catálogo de Policies (estudo + IaC)

Catálogo de todas as IAM policies do projeto, pra **estudo de SAA-C03** (Domínio 1
é o de maior peso) e como **referência de Policy-as-Code**.

> 🔒 **Templatizado de propósito.** O repo é público, então os identificadores reais
> estão como placeholders. Policy **não é credencial** — saber a policy não permite
> usá-la (o boundary real é a *trust policy* + higiene de credencial). Mas em repo
> público a config real é superfície de recon, então não publicamos os valores.
>
> Placeholders: `ACCOUNT_ID` · `<owner>/<repo>` · `<ecr-repo>` ·
> `<frontend-bucket>` · `<documents-bucket>` · `<releases-bucket>`.

Relacionado: [Domínio 1 — Segurança](dominio-1-seguranca.md) · [ficha IAM](servicos/iam.md).

---

## Role 1 — GitHub Actions (OIDC) · `<github-actions-role>`

Usada pelo CI. Assumida via OIDC (sem chave estática). **A trust policy é o
boundary**: só o repo+branch certos conseguem assumir.

**Trust policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:<owner>/<repo>:ref:refs/heads/master" }
    }
  }]
}
```
> 💡 A condição `sub` é o que impede um fork ou outra branch de assumir a role. Sem
> ela, qualquer repositório no GitHub poderia. `aud` confirma que o token é pra STS.

**Inline `<...>-ecr-push`** — push da imagem da API no ECR:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "EcrAuthToken", "Effect": "Allow", "Action": "ecr:GetAuthorizationToken", "Resource": "*" },
    { "Sid": "EcrPushPull", "Effect": "Allow",
      "Action": ["ecr:BatchCheckLayerAvailability","ecr:InitiateLayerUpload","ecr:UploadLayerPart",
                 "ecr:CompleteLayerUpload","ecr:PutImage","ecr:BatchGetImage","ecr:GetDownloadUrlForLayer"],
      "Resource": "arn:aws:ecr:sa-east-1:ACCOUNT_ID:repository/<ecr-repo>" }
  ]
}
```
> 💡 `GetAuthorizationToken` **exige** `Resource: "*"` (token é a nível de conta).
> As ações de layer são escopadas a **um repositório** — least privilege.

**Inline `<...>-github-actions`** — deploy do frontend/desktop e invalidação do CDN:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "FrontendS3", "Effect": "Allow",
      "Action": ["s3:PutObject","s3:DeleteObject","s3:ListBucket"],
      "Resource": ["arn:aws:s3:::<frontend-bucket>","arn:aws:s3:::<frontend-bucket>/*"] },
    { "Sid": "DesktopS3", "Effect": "Allow",
      "Action": ["s3:PutObject","s3:GetObject","s3:ListBucket"],
      "Resource": ["arn:aws:s3:::<releases-bucket>","arn:aws:s3:::<releases-bucket>/*"] },
    { "Sid": "CloudFront", "Effect": "Allow", "Action": "cloudfront:CreateInvalidation", "Resource": "*" }
  ]
}
```
> 💡 `CreateInvalidation` também pede `Resource: "*"` (a API não aceita ARN de
> distribuição em algumas contas/versões). O resto é escopado por bucket.

**Inline `<...>-ssm-run-command`** — deploy via SSM (sem SSH):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "SSMSendCommand", "Effect": "Allow", "Action": "ssm:SendCommand",
      "Resource": ["arn:aws:ec2:sa-east-1:ACCOUNT_ID:instance/*",
                   "arn:aws:ssm:sa-east-1::document/AWS-RunShellScript"] },
    { "Sid": "SSMGetCommandInvocation", "Effect": "Allow", "Action": "ssm:GetCommandInvocation", "Resource": "*" }
  ]
}
```
> 💡 Caso clássico de prova: `GetCommandInvocation` **exige** `Resource: "*"` (o ID
> do comando é dinâmico, não existe na hora de escrever a policy). Por isso fica num
> `Statement` separado, em vez de afrouxar o `SendCommand`.

---

## Role 2 — EC2 Instance Profile · `<ec2-role>`

"Vestida" pela instância. O SDK pega credenciais via IMDSv2 — sem chave no disco.

**Trust policy:**
```json
{ "Version": "2012-10-17",
  "Statement": [{ "Effect": "Allow", "Principal": { "Service": "ec2.amazonaws.com" }, "Action": "sts:AssumeRole" }] }
```

**Managed (AWS-managed):**
- `AmazonSSMManagedInstanceCore` — o agente SSM funcionar (Run Command, Session Manager).
- `AmazonSSMReadOnlyAccess` — ler parâmetros do Parameter Store (segredos em runtime).
- `AmazonEC2ContainerRegistryReadOnly` — `docker pull` da imagem no ECR.

**Inline `<...>-db-backups-s3`** — backup diário do banco pro S3:
```json
{ "Version": "2012-10-17",
  "Statement": [{ "Sid": "PsyManagerDbBackups", "Effect": "Allow",
    "Action": ["s3:PutObject","s3:DeleteObject"],
    "Resource": "arn:aws:s3:::<documents-bucket>/db-backups/*" }] }
```

**Inline `<...>-documents-s3-access`** — presigned URLs de documentos:
```json
{ "Version": "2012-10-17",
  "Statement": [{ "Sid": "PsyManagerDocumentsObjectAccess", "Effect": "Allow",
    "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject"],
    "Resource": "arn:aws:s3:::<documents-bucket>/documents/*" }] }
```
> 💡 Os dois inlines acima escopam por **prefixo** (`db-backups/*` e `documents/*`)
> dentro do mesmo bucket — least privilege fino. A presigned URL só delega o que a
> role já pode fazer.

---

## Role 3 — EventBridge Scheduler · `<scheduler-role>` (planejada)

Ainda **não criada** — necessária pro go-live do WhatsApp (ver
`../../ai/tasks/task-whatsapp-reminder.md`). Desenho previsto:
- **Trust**: principal `scheduler.amazonaws.com`.
- **Permissão**: `lambda:InvokeFunction` no ARN da função de lembrete.
- A role da EC2/API precisa de `scheduler:CreateSchedule/DeleteSchedule` + `iam:PassRole` sobre esta role.

---

## Padrões que se repetem (resumo de estudo)

- **Trust policy = boundary real.** Quem pode assumir (OIDC `sub`, `ec2.amazonaws.com`, `scheduler.amazonaws.com`). É o que você protege — não o sigilo da permission policy.
- **Least privilege por ARN/prefixo.** Buckets por bucket, ECR por repositório, S3 por prefixo (`db-backups/`, `documents/`).
- **Exceções legítimas com `Resource: "*"`:** `ecr:GetAuthorizationToken`, `ssm:GetCommandInvocation`, `cloudfront:CreateInvalidation` — não por descuido, mas porque a API não aceita ARN específico. Isole num `Statement` próprio.
- **Managed vs inline:** managed (AWS) pra necessidades padrão (SSM, ECR pull); inline pra regras específicas do projeto.
- **Sem chave estática:** OIDC (CI) e Instance Profile/IMDSv2 (EC2) — credenciais temporárias.
