> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 19. 🖥️ AWS Systems Manager Session Manager: Deploy sem SSH

Esta seção documenta a substituição completa do SSH por SSM Session Manager no pipeline de CI/CD — eliminando a porta 22 exposta e a chave SSH no GitHub Secrets.

### A. O Problema com SSH no CI/CD

O modelo anterior usava `appleboy/ssh-action` com três GitHub Secrets: `EC2_SSH_KEY`, `EC2_HOST` e `EC2_USERNAME`. Esse modelo tem três problemas:

1. **Porta 22 exposta**: o Security Group precisava abrir TCP 22 para `0.0.0.0/0` — qualquer máquina na internet podia tentar autenticar.
2. **Chave de longa duração**: `EC2_SSH_KEY` é uma chave privada RSA que nunca expira por padrão. Se vazar do GitHub, o atacante tem acesso ao servidor indefinidamente.
3. **Dependência de IP**: o runner do GitHub Actions precisa alcançar o servidor por rede pública.

A pergunta na SAA-C03 aparece assim: *"Como eliminar a necessidade de chaves SSH e portas expostas para acesso administrativo a instâncias EC2?"*. A resposta é: **AWS Systems Manager Session Manager**.

### B. Como Funciona o SSM Session Manager

```
GitHub Actions Runner
     │
     │  1. aws ssm send-command (via IAM Role OIDC)
     ▼
AWS SSM Control Plane (endpoint regional)
     │
     │  2. SSM entrega o comando via canal HTTPS persistente
     ▼
SSM Agent (rodando no EC2 como snap.amazon-ssm-agent)
     │
     │  3. Executa o script localmente como root
     │  4. Publica stdout/stderr de volta para o SSM Control Plane
     ▼
GitHub Actions lê o resultado via GetCommandInvocation
```

O EC2 **nunca abre uma porta de entrada** para o runner. A comunicação é iniciada pelo agente SSM de dentro da instância, via HTTPS de saída para os endpoints do SSM. O Security Group não precisa de nenhuma regra de entrada além de 80/443 para a aplicação.

### C. Pré-requisitos no EC2

**1. SSM Agent instalado e rodando**

No Ubuntu 24.04 (noble), o SSM Agent vem via snap:

```bash
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service
```

Se aparecer erros `400 RequestError` no status do agent, o problema é IAM — o agente consegue se comunicar com o endpoint SSM mas não tem permissão para se registrar.

**2. IAM Role com `AmazonSSMManagedInstanceCore`**

A política gerenciada `AmazonSSMManagedInstanceCore` dá ao EC2 as permissões mínimas para o SSM Agent funcionar:

```text
IAM > Roles > psy-manager-ec2-role > Permissions > Add permissions
  > Attach policies > AmazonSSMManagedInstanceCore
```

Após adicionar a policy, reiniciar o agente:

```bash
sudo snap restart amazon-ssm-agent
```

O status muda de `400 RequestError` para `Online` no console SSM > Fleet Manager.

### D. Permissões IAM no GitHub Actions Role

O role `psy-manager-github-actions-role` precisou de duas declarações separadas — e entender por que é importante para a prova:

**Por que duas declarações?**

`ssm:GetCommandInvocation` **não aceita ARN específico** — ele requer `Resource: "*"`. Isso porque o comando ainda não existe quando você escreve a policy; o ID do comando é gerado dinamicamente pelo SSM no momento do `send-command`.

Se você colocar tudo em uma declaração com `Resource: "*"`, funciona mas viola o menor privilégio. A solução é separar:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SSMSendCommand",
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ec2:sa-east-1:952078551945:instance/*",
        "arn:aws:ssm:sa-east-1::document/AWS-RunShellScript"
      ]
    },
    {
      "Sid": "SSMGetCommandInvocation",
      "Effect": "Allow",
      "Action": "ssm:GetCommandInvocation",
      "Resource": "*"
    }
  ]
}
```

`SendCommand` fica restrito à instância correta e ao documento permitido. `GetCommandInvocation` fica em `"*"` porque a API exige — mas é uma operação somente de leitura (polling de status).

### E. Script de Deploy Versionado (`scripts/deploy.sh`)

Em vez de embutir todo o script inline no YAML do workflow (difícil de manter, sem histórico de git, sem diff no PR), o deploy foi movido para um arquivo versionado no repositório:

**`scripts/deploy.sh`** — responsabilidades:
1. Busca todos os parâmetros do SSM Parameter Store
2. Gera o arquivo `.env.prod` em memória com os valores
3. Sobe os containers com `docker compose ... up -d --force-recreate`
4. Roda as migrações com `bun run db:migrate`

```bash
#!/bin/bash
set -euo pipefail

REGION="sa-east-1"
PROJECT_DIR="/home/ubuntu/psy-manager"

echo "==> Fetching secrets from SSM..."
POSTGRES_PASSWORD=$(aws ssm get-parameter --region "$REGION" \
  --name "/psy-manager/prod/POSTGRES_PASSWORD" --with-decryption \
  --query "Parameter.Value" --output text)

cat > "$PROJECT_DIR/.env.prod" << EOF
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/psy_manager
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
# ... todos os outros parâmetros via aws ssm get-parameter
EOF

cd "$PROJECT_DIR"
set -a && source .env.prod && set +a
docker compose -f docker-compose.prod.yml up -d --force-recreate --remove-orphans
docker compose -f docker-compose.prod.yml exec -T api bun run db:migrate \
  || echo "Migrations: nothing to run"

echo "==> Deploy complete."
```

`set -euo pipefail` garante que o script falha imediatamente em qualquer erro — sem continuar silenciosamente após um `get-parameter` falhar. O `set -a && source .env.prod && set +a` exporta todas as variáveis do arquivo para o ambiente do shell antes do `docker compose`, que usa interpolação `${VAR}` no YAML.

> **Nota:** a partir da **Seção 20**, este script foi atualizado — o `--build` foi removido e substituído por `docker compose pull` da imagem versionada no ECR (princípio "build once, deploy the same artifact"). O `deploy.sh` passou a receber o digest da imagem como argumento.

### F. O Workflow: send-command + Polling

O job `deploy-backend` no `deploy-ec2.yml` tem dois passos SSM — cada um usa o mesmo padrão: enviar o comando, pegar o `CommandId`, e fazer polling até `Success` ou falha:

```yaml
- name: Pull latest code on EC2
  run: |
    INSTANCE_ID="${{ secrets.EC2_INSTANCE_ID }}"
    COMMAND_ID=$(aws ssm send-command \
      --region sa-east-1 \
      --instance-ids "$INSTANCE_ID" \
      --document-name "AWS-RunShellScript" \
      --parameters 'commands=["sudo -u ubuntu git -C /home/ubuntu/psy-manager reset --hard origin/master"]' \
      --query "Command.CommandId" --output text)

    for i in $(seq 1 30); do
      STATUS=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" \
        --query "Status" --output text 2>/dev/null || echo "Pending")
      if [[ "$STATUS" == "Success" ]]; then break; fi
      if [[ "$STATUS" == "Failed" || "$STATUS" == "Cancelled" || "$STATUS" == "TimedOut" ]]; then
        aws ssm get-command-invocation ... --query "StandardErrorContent" --output text
        exit 1
      fi
      sleep 5
    done

- name: Deploy (secrets + restart + migrate)
  run: |
    # Mesmo padrão, mas com --timeout-seconds 600 e 120 iterações
    COMMAND_ID=$(aws ssm send-command \
      --parameters 'commands=["bash /home/ubuntu/psy-manager/scripts/deploy.sh 2>&1"]' \
      --timeout-seconds 600 ...)
```

`--timeout-seconds 600` é o timeout do SSM — se o script não terminar em 10 minutos, o SSM marca como `TimedOut`. O loop de polling usa 120 iterações × 5s = 10 minutos de espera máxima no runner.

### G. Bugs Encontrados e Resolvidos

**Bug 1: `fatal: $HOME not set` + `detected dubious ownership`**

O SSM Run Command executa como `root` sem HOME configurado. O git precisa de HOME para encontrar `~/.gitconfig`, e a checagem de segurança do git (`safe.directory`) falha porque o diretório `/home/ubuntu/psy-manager` pertence ao usuário `ubuntu`, não ao `root`.

Solução: trocar todos os comandos git por `sudo -u ubuntu git ...`. O `-u ubuntu` faz o git rodar com o usuário dono do diretório, resolvendo os dois problemas de uma vez.

**Bug 2: `AccessDeniedException` no `ssm:GetCommandInvocation`**

O status ficava sempre `Pending` porque o `GetCommandInvocation` silenciosamente falhava. A causa: a policy não tinha `Resource: "*"` para essa ação. Solução: separar em dois `Statement` como na seção D acima.

**Bug 3: `AccessDeniedException: secretsmanager:GetSecretValue`**

O `scripts/deploy.sh` tinha sido escrito numa versão anterior com uma chamada ao Secrets Manager para `POSTGRES_PASSWORD`. Como o projeto não usa o Secrets Manager (apenas SSM), a policy do EC2 não tem `secretsmanager:GetSecretValue`. Revertido para `aws ssm get-parameter --with-decryption`.

**Bug 4: Policy adicionada na role errada**

A policy de `ssm:SendCommand` foi adicionada na `psy-manager-ec2-role` (role do servidor) em vez da `psy-manager-github-actions-role` (role do runner do GitHub). O runner é quem chama `SendCommand`; o EC2 é quem recebe. Erro corrigido movendo a policy para a role correta.

### H. SSH sobre Túnel SSM (Acesso Local)

Além do CI/CD, o SSM Session Manager também permite SSH do notebook sem abrir a porta 22:

```
Notebook local
  │
  │  ssh i-07dde8ea0e7a1b49c
  ▼
ProxyCommand: aws ssm start-session --document-name AWS-StartSSHSession
  │           (abre um túnel para o SSM Control Plane)
  ▼
SSM Agent no EC2
  │  (encaminha para o sshd local na porta 22 internamente)
  ▼
Shell do EC2 como ubuntu
```

A porta 22 **não precisa estar aberta no Security Group** — o encaminhamento acontece dentro da VPC, entre o SSM Agent e o sshd local.

**Pré-requisito local**: instalar o SSM Session Manager Plugin:

```bash
# Ubuntu/Debian
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o ssm-plugin.deb
sudo dpkg -i ssm-plugin.deb
```

**`~/.ssh/config`:**

```ssh-config
Host ec2
    HostName i-07dde8ea0e7a1b49c
    ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p' --region sa-east-1"
    User ubuntu
    IdentityFile ~/.ssh/psy-manager-key.pem

Host i-*
    ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p' --region sa-east-1"
    User ubuntu
    IdentityFile ~/.ssh/psy-manager-key.pem
```

Conectar:

```bash
ssh ec2                    # via alias
ssh i-07dde8ea0e7a1b49c    # via Instance ID diretamente
```

O Instance ID **não muda** enquanto a instância existir — ele persiste através de stops, starts e reboots. Só mudaria se a instância fosse terminada e uma nova criada.

### I. O Que Cai na SAA-C03

- **SSM Session Manager vs SSH**: a pergunta clássica é "como eliminar chaves SSH e reduzir a superfície de ataque de instâncias EC2?". A resposta é SSM Session Manager — sem porta 22, sem chave privada, acesso auditado via CloudTrail.
- **SSM Run Command vs Session Manager**: Run Command executa scripts remotamente e retorna o output. Session Manager abre um shell interativo (ou túnel SSH). Para CI/CD automatizado, Run Command é o correto.
- **AmazonSSMManagedInstanceCore**: política gerenciada mínima necessária para que o SSM Agent funcione — registrar a instância, receber comandos e publicar output. Sem ela, o agent fica em loop de `400 RequestError`.
- **Princípio do Menor Privilégio em políticas IAM**: `GetCommandInvocation` é um caso real onde o menor privilégio tecnicamente exige `Resource: "*"` — não por descuido, mas porque a API não aceita ARN específico.
- **Instance Metadata Service (IMDS)**: o SSM Agent e o SDK da AWS no EC2 se autenticam automaticamente via IMDSv2 — sem chaves no disco.
- **Auditoria via CloudTrail**: cada `send-command` e cada sessão SSM gera eventos no CloudTrail. É um argumento forte para substituir SSH (que não gera log de auditoria centralizado) por SSM.

---

