> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 16. 🔑 IAM OIDC Federation: GitHub Actions sem Chaves de Longa Duração

Esta seção documenta a substituição das chaves de acesso IAM estáticas no GitHub Actions por credenciais temporárias via OIDC (OpenID Connect).

### A. O Problema com Chaves de Longa Duração

O padrão anterior usava `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` armazenadas como GitHub Secrets. Essas chaves:

- Nunca expiram por padrão — se vazarem, o atacante tem acesso indefinido.
- Precisam ser rotacionadas manualmente (ou com automação extra).
- Violam o **Princípio do Menor Privilégio no Tempo** (acesso existe mesmo entre deploys).

A pergunta na SAA-C03 geralmente aparece assim: *"Como uma workload em CI/CD externa à AWS pode assumir uma role IAM sem armazenar credenciais de longa duração?"*. A resposta é: **IAM OIDC Provider**.

### B. Como Funciona o OIDC Federation

```
GitHub Actions Runner
     │
     │  1. Solicita JWT assinado pelo GitHub
     │     (contém: repositório, branch, workflow)
     ▼
GitHub OIDC Provider (token.actions.githubusercontent.com)
     │
     │  2. Runner apresenta o JWT ao AWS STS
     ▼
AWS STS (AssumeRoleWithWebIdentity)
     │
     │  3. STS valida o JWT contra o OIDC Provider cadastrado
     │  4. STS emite credenciais temporárias (1 hora de validade)
     ▼
GitHub Actions usa credenciais temporárias
```

Nenhuma chave fica armazenada em lugar nenhum. As credenciais existem apenas na memória do runner durante o job.

### C. Configuração Realizada

**1. OIDC Provider no IAM**

```text
IAM > Identity providers > Add provider
  Provider type: OpenID Connect
  Provider URL:  https://token.actions.githubusercontent.com
  Audience:      sts.amazonaws.com
```

Isso registra o GitHub como emissor de tokens confiável na sua conta AWS.

**2. IAM Role com Trust Policy restrita ao repositório**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::952078551945:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:luvvas/psy-manager:ref:refs/heads/master"
        }
      }
    }
  ]
}
```

A condição `sub` restringe: apenas o repositório `luvvas/psy-manager`, branch `master`, pode assumir essa role. Um fork ou outra branch não consegue.

**3. Workflow atualizado (`deploy-ec2.yml`)**

```yaml
permissions:
  id-token: write   # obrigatório: permite que o runner solicite o JWT
  contents: read

steps:
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::952078551945:role/psy-manager-github-actions-role
      aws-region: sa-east-1
```

A action `configure-aws-credentials` faz o fluxo OIDC internamente: solicita o JWT, chama `sts:AssumeRoleWithWebIdentity`, e injeta as credenciais temporárias nas variáveis de ambiente do runner (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`) — mas elas expiram em 1 hora e não ficam armazenadas em lugar nenhum.

### D. Por Que Isso Não Precisa de Rotação

As credenciais são temporárias por design:
- Emitidas na hora: cada job recebe um conjunto novo.
- Expiram em 1 hora: mesmo se vazarem dos logs, já expiraram.
- Não existem fora do job: não há nada para rotacionar.

A EC2, por sua vez, usa **Instance Profile** (IAM Role anexada à instância). O SDK detecta as credenciais automaticamente via metadados da instância — também sem chaves de longa duração.

**Resultado:** Não há nenhuma chave AWS armazenada nem no GitHub Secrets nem em servidores.

### E. O Que Cai na SAA-C03

- **IAM Identity Providers**: registrar um provedor OIDC externo para federar identidades.
- **AssumeRoleWithWebIdentity**: a API do STS usada para trocar um JWT por credenciais temporárias. Diferente de `AssumeRole` (mesmo-conta) e `AssumeRoleWithSAML` (SAML).
- **Condições na Trust Policy**: `StringEquals` com claims do JWT (`sub`, `aud`) para restringir quem pode assumir a role. Sem a condição `sub`, qualquer repositório no GitHub poderia assumir sua role.
- **IAM Role vs IAM User**: roles emitem credenciais temporárias. Users emitem credenciais permanentes. Para workloads (EC2, Lambda, ECS, CI/CD), sempre prefira roles.
- **Princípio do Menor Privilégio no Tempo**: credenciais com curta validade reduzem a janela de exposição mesmo em caso de vazamento.

---

