> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 20. 📦 Build Once, Deploy the Same Artifact (Amazon ECR + Trivy)

Até agora o backend tinha um problema sutil de **integridade de artefato**: o
pipeline testava o código na máquina do GitHub Actions, mas a imagem Docker da
API era **reconstruída do zero dentro da EC2** no momento do deploy
(`docker compose up --build`). Ou seja, o artefato testado e o artefato
implantado eram produzidos por **dois builds diferentes, em duas máquinas
diferentes**. Nada garantia que fossem idênticos.

Refatoramos o backend para seguir o princípio **"build once, test the same
artifact, deploy the same artifact"**: a imagem é construída **uma única vez**
no CI, escaneada, enviada para um registro (ECR) e a EC2 apenas **baixa e roda
exatamente aquela imagem**, identificada pelo seu *digest* imutável.

> O frontend já seguia esse padrão desde a seção 9 — ele constrói o `dist` uma
> vez, sobe o artefato, e tanto o S3 quanto o release Desktop reutilizam o mesmo
> artefato. Esta seção traz o backend para o mesmo nível.

### A. Os Três Conceitos

**1. Registry / Amazon ECR (Elastic Container Registry)**
Um *registry* é um servidor de armazenamento de imagens Docker (o npm é para
pacotes, o ECR é para imagens de container). Você faz `push` de uma máquina e
`pull` de outra. O **ECR** é o registry da AWS — escolhido aqui porque já
estamos em `sa-east-1`, a EC2 já tem IAM Role, e o pull acontece dentro da rede
da AWS (rápido, sem credenciais extras). Antes não havia registry nenhum: a
imagem só existia na máquina que a construía, por isso éramos obrigados a
reconstruir na EC2.

**2. Digest (a "impressão digital" da imagem)**
Ao construir uma imagem, o Docker calcula um hash SHA-256 do conteúdo exato:
`sha256:9f86d0...`. Esse é o **digest**, e ele é **imutável** — se um único byte
mudar, o digest muda. Logo, `repo@sha256:9f86d0...` aponta para **uma imagem
exata, para sempre**. Diferente de uma *tag* como `latest`, que é só um rótulo
móvel (você pode reapontá-la amanhã). É por isso que o deploy referencia o
**digest**, não a tag: é a garantia criptográfica de que imagem testada =
imagem implantada.

**3. Trivy (scanner de vulnerabilidades)**
Ferramenta open-source que escaneia a imagem em busca de CVEs conhecidas (tanto
nos pacotes do sistema do `alpine` quanto nas dependências). Como a imagem agora
existe no CI **antes** do deploy, é o lugar natural para escanear e **bloquear**
o pipeline caso encontre falhas graves. Fixamos a versão da action
(`aquasecurity/trivy-action@v0.36.0`) — mesma lição de imutabilidade aplicada à
ferramenta: nunca `@latest`.

### B. O Novo Fluxo do Pipeline

```
GitHub Actions:  build imagem  →  Trivy scan  →  push ECR (tag: <sha>, captura digest)
                                                          │
EC2 (deploy.sh): docker pull <ecr-repo>@sha256:<digest>  ◄┘  →  up -d  →  migrate
                 (sem mais --build)
```

Jobs do `deploy-ec2.yml`:
- **`quality-gate`** e **`build-api-image`** rodam **em paralelo**. O segundo
  builda, escaneia (Trivy) e dá push da imagem, expondo o digest como *output*.
- **`build-frontend`** também roda em paralelo (antes esperava o `quality-gate`
  sem necessidade).
- **`deploy-backend`** depende de **ambos** `quality-gate` **e**
  `build-api-image` — então um teste quebrado nunca chega à produção, mas o
  build nunca segura os testes.
- **`deploy-frontend`** / **`deploy-desktop`** dependem de `quality-gate` +
  `build-frontend`.

O digest é passado para a EC2 via SSM como argumento do `deploy.sh`, que faz
login no ECR, `docker compose pull api` e sobe o container — sem `--build`.

### C. Configuração na AWS (feito uma vez)

**1. Criar o repositório ECR**
```bash
aws ecr create-repository \
  --region sa-east-1 \
  --repository-name psy-manager-api \
  --image-tag-mutability IMMUTABLE \
  --image-scanning-configuration scanOnPush=true
```
Ou pelo Console: **ECR > Repositories > Create repository**, nome
`psy-manager-api`, região `sa-east-1`. URI resultante:
`952078551945.dkr.ecr.sa-east-1.amazonaws.com/psy-manager-api`.

💡 *Dica SAA*: `IMMUTABLE` impede que uma tag já existente seja sobrescrita —
reforça a integridade de artefato no próprio registry.

**2. Dar permissão de PUSH à Role do GitHub Actions**
A role OIDC `psy-manager-github-actions-role` precisa empurrar imagens.
**IAM > Roles > psy-manager-github-actions-role > Add permissions > Create
inline policy > JSON**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrAuthToken",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "EcrPushPull",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": "arn:aws:ecr:sa-east-1:952078551945:repository/psy-manager-api"
    }
  ]
}
```
Nome sugerido: `psy-manager-ecr-push`.

**3. Dar permissão de PULL à Role da EC2**
A role `psy-manager-ec2-role` precisa baixar a imagem. O jeito mais simples é
anexar a policy gerenciada **`AmazonEC2ContainerRegistryReadOnly`**:
**IAM > Roles > psy-manager-ec2-role > Add permissions > Attach policies** →
`AmazonEC2ContainerRegistryReadOnly`.

(Essa policy já inclui `ecr:GetAuthorizationToken`, então o
`aws ecr get-login-password` dentro do `deploy.sh` funciona.)

**4. Nenhum secret novo no GitHub**
Continuamos usando OIDC + IAM Role (sem `AWS_ACCESS_KEY_ID` fixo). O único
"contrato" hardcoded é o ARN da role e o nome do repositório (`ECR_REPOSITORY`
no `env:` do workflow).

### D. Política do Trivy

O scan está configurado para **falhar** o pipeline em CVEs **CRITICAL** com
correção disponível (`ignore-unfixed: true`):
```yaml
severity: CRITICAL
ignore-unfixed: true
exit-code: '1'
```
- Para ser mais rigoroso: adicione `HIGH` em `severity`.
- Para começar em modo **não-bloqueante** (apenas relatório) enquanto você limpa
  a baseline: troque `exit-code` para `'0'` e volte para `'1'` depois.

### E. O Que Cai na SAA-C03 / DevOps

- **Artifact integrity**: testar e implantar o mesmo binário, não reconstruir.
- **Amazon ECR**: registry privado, tags imutáveis, scan on push.
- **Digest pinning**: referência imutável (`@sha256:`) vs tag móvel (`latest`).
- **IAM least privilege**: GitHub só faz push no repositório `psy-manager-api`;
  EC2 só faz pull (read-only).
- **OIDC**: federação de identidade GitHub→AWS, sem chaves estáticas.
- **Shift-left security**: Trivy escaneia antes do deploy, não depois.
- **Paralelismo de pipeline**: jobs independentes (build/test) rodam juntos;
  jobs de deploy aguardam os gates corretos.

### F. Verificação Após o Deploy

```bash
# 1. CI: o job "CI / API Image" deve dar push de psy-manager-api:<sha> e logar o digest.
# 2. Na EC2, confirme que o container roda EXATAMENTE o digest do CI:
docker inspect --format='{{index .Config.Image}}' psy-manager-api
docker inspect --format='{{.Image}}' psy-manager-api
# 3. Health check da aplicação:
curl https://dswfc48bg9ft6.cloudfront.net/api/health   # se o endpoint existir
