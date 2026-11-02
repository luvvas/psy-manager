> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 16. ☁️ Saída da AWS: VPS (Hostinger) + Cloudflare

Este estágio remove o vendor lock-in com a AWS. A produção passa a rodar numa
VPS Hostinger KVM 1 em São Paulo (12 meses, ~R$400), com a Cloudflare (plano
gratuito) fazendo DNS, TLS, WAF, CDN, acesso administrativo, storage (R2) e
TURN. Os estágios 00–14 ficam como registro histórico do período na AWS.

### A. O que saiu e o que entrou

| AWS (antes) | Agora |
|---|---|
| EC2 t3.micro | VPS Hostinger KVM 1 (1 vCPU / 4 GB / 50 GB NVMe), SP |
| S3 + CloudFront (SPA) | Container `web` (nginx) na VPS + cache na borda da Cloudflare |
| CloudFront proxy `/api`, `/trpc` | O mesmo nginx; domínio único, cookie `SameSite=Lax` mantido |
| S3 (documentos) | Cloudflare R2 (mesmo SDK S3, só muda endpoint e credenciais) |
| SSM Parameter Store | Secret `PROD_ENV_FILE` no environment `production` do GitHub |
| SSM Run Command / Session Manager | SSH via Cloudflare Access (Tunnel, cloudflared no host), sem porta 22 aberta |
| ECR | GHCR (`ghcr.io/luvvas/psy-manager-api` e `-web`) |
| IAM / OIDC | Tokens com escopo mínimo (R2 por bucket, service token do Access, `GITHUB_TOKEN`) |
| EventBridge Scheduler + Lambda | **Removidos** (lembretes de WhatsApp saem por ora) |
| coturn no EC2 | Cloudflare Realtime TURN (credenciais efêmeras por chamada) |
| `pg_dump` → S3 | `scripts/backup-db.sh` → R2 (bucket e token próprios) |

### B. Como a segurança da AWS foi substituída

- **Security Group** → a VPS não tem **nenhuma porta de entrada aberta**. O
  `cloudflared` abre uma conexão *de saída* para a Cloudflare e o tráfego entra
  por ela. O `docker-compose.prod.yml` não publica portas porque o **Docker
  ignora o ufw** ao publicar uma porta.
- **CloudFront** → proxy da Cloudflare: TLS automático, DDoS, WAF gerenciado,
  Bot Fight Mode e regra de rate limit. Como a origem só é alcançável pelo
  Tunnel, isso equivale ao OAC do S3. O IP real do cliente vem de
  `cf-connecting-ip` (`apps/api/src/index.ts`).
- **IAM** → cada credencial só faz uma coisa: o token R2 da API só acessa o
  bucket de documentos, o do backup só o bucket de backups, e o service token
  do Access só abre o SSH. Na VPS, o usuário `deploy` não é root.
- **SSM Session Manager** → Cloudflare Access na frente do SSH. Humanos entram
  com login (e-mail + código); o CI entra com service token.

---

### C. Passo a passo manual (fazer nesta ordem)

> Nada abaixo afeta a produção atual na AWS até o passo 9. A branch
> `chore/sair-da-aws` só deve ir para a `master` no passo 8 (depois dos passos
> 1–6), porque o push em `master` dispara o novo deploy. A ordem real é
> 1–6, 8 e então 7.

#### 1. Domínio + Cloudflare

1. Registre o domínio grátis (1 ano) que vem com a VPS KVM 1 da Hostinger
   (ou um domínio neutro, como o seu nome, até o produto ter nome definitivo:
   trocar o domínio do app depois é só uma rota nova no Tunnel e as URLs no
   `PROD_ENV_FILE`).
   Crie a conta na Cloudflare, adicione o domínio (*Add a site*, plano Free) e,
   no hPanel da Hostinger (*Domínios → DNS / Nameservers*), troque os
   nameservers para os dois que a Cloudflare indicar. O registro continua na
   Hostinger; DNS, proxy e TLS passam a ser da Cloudflare. A propagação leva de
   minutos a algumas horas.
   - Anote o preço de **renovação** do domínio. Antes de vencer, compare com
     transferir para o Cloudflare Registrar (preço de custo; a transferência só
     é liberada 60 dias após o registro). `.com.br` não pode ir para a
     Cloudflare: nesse caso compare com o Registro.br.
   - Não use os registros DNS da Hostinger depois da troca: eles deixam de valer.
2. **SSL/TLS** → modo *Full (strict)*; ative *Always Use HTTPS*, *Automatic
   HTTPS Rewrites*, TLS mínimo 1.2 e HSTS (comece com `max-age` baixo).
3. **Security** → ative *Bot Fight Mode* e o *Cloudflare Free Managed Ruleset*
   do WAF.
4. **Security → WAF → Rate limiting rules** (1 grátis): `URI Path` começa com
   `/api/auth/sign-in` → 10 requisições / 10 s por IP → Block.
5. **Caching → Cache Rules**: *Bypass cache* para paths começando com `/api`,
   `/trpc` e `/ws`. Os `/assets/*` já saem com `Cache-Control: immutable` do
   nginx, e a Cloudflare respeita isso.

#### 2. VPS Hostinger

1. Contrate a **KVM 1, São Paulo, Ubuntu 24.04 LTS limpo** (sem painel). Anote o
   preço de renovação e crie um lembrete 30 dias antes do vencimento. Na mesma
   compra, resgate o domínio grátis (ele é usado no passo 1).
2. Primeiro acesso como root (pelo IP, com a senha/chave do painel):

```bash
adduser deploy && usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
# cole sua chave pública pessoal em /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# swap de 2 GB
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# atualizações de segurança automáticas
apt update && apt -y upgrade && apt -y install unattended-upgrades ufw age
# rclone oficial: o do apt (1.60) recebe 501 NotImplemented do R2 no `rcat`
curl -fsSLO https://downloads.rclone.org/rclone-current-linux-amd64.deb && dpkg -i rclone-current-linux-amd64.deb && rm rclone-current-linux-amd64.deb
dpkg-reconfigure -plow unattended-upgrades

# Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

3. Endureça o SSH em `/etc/ssh/sshd_config.d/00-hardening.conf`. O prefixo
   `00-` importa: o sshd usa o **primeiro** valor que encontra, e algumas
   imagens trazem um `50-cloud-init.conf` com `PasswordAuthentication yes`.

```
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
AllowUsers deploy
```

`sshd -t && systemctl restart ssh`, confira com
`sshd -T | grep -Ei 'passwordauth|permitroot'` e teste `ssh deploy@<ip>`
**antes** de fechar a sessão root.

4. Firewall: `ufw default deny incoming && ufw default allow outgoing && ufw allow 22/tcp && ufw enable`.
   A porta 22 só fica aberta até o passo 3. No painel da Hostinger, ative
   também o firewall da VPS com a mesma regra.

#### 3. Cloudflare Tunnel + Access (SSH sem porta aberta)

1. **Zero Trust → Networks → Tunnels → Create tunnel** (tipo *Cloudflared*),
   nome `psy-manager`. Escolha *Debian/Ubuntu* e rode na VPS o comando que o
   painel mostra (`cloudflared service install <token>`). O cloudflared roda
   **no host, não no Docker**: assim o SSH via Tunnel continua de pé mesmo se o
   Docker cair, e ele alcança `localhost:22` sem brecha no firewall.
2. *Public hostnames* do tunnel:
   - `app.<dominio>` → `HTTP` → `localhost:8080` (o container `web` publica só em `127.0.0.1:8080`)
   - `ssh.<dominio>` → `SSH` → `localhost:22`
3. **Zero Trust → Access → Applications → Self-hosted** para `ssh.<dominio>`:
   - Policy "humanos": *Allow* → *Emails* = seu e-mail.
   - Policy "CI": *Service Auth* → service token criado em
     *Access → Service Auth → Create service token*. Guarde o Client ID/Secret.
4. Na sua máquina: `cloudflared access ssh-config --hostname ssh.<dominio>`
   mostra o bloco para o `~/.ssh/config`. Teste `ssh deploy@ssh.<dominio>`.
5. Funcionou? Feche a porta: `ufw delete allow 22/tcp`, e remova a regra 22 do
   firewall do painel. A partir daqui, `nmap` no IP da VPS não deve achar nada.
6. Mantenha o cloudflared atualizado: ele vem do repositório apt da Cloudflare,
   então o `unattended-upgrades` não pega por padrão. Rode `apt upgrade cloudflared`
   de tempos em tempos, ou adicione a origem `cloudflare` ao unattended-upgrades.

#### 4. R2 (documentos + backups)

1. **R2 → Create bucket**: `psy-manager-documents` e `psy-manager-backups`
   (localização: *South America* se disponível, ou *Automatic*).
2. **CORS** do `psy-manager-documents` (upload/download direto do navegador via URL pré-assinada):

```json
[
  {
    "AllowedOrigins": ["https://app.<dominio>"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

3. **Lifecycle** do `psy-manager-backups`: expirar objetos com prefixo
   `db-backups/` após 90 dias.
4. **Manage R2 API Tokens**: crie **dois** tokens *Object Read & Write*, cada
   um restrito a **um** bucket. Anote Access Key ID, Secret e o endpoint
   `https://<account-id>.r2.cloudflarestorage.com`.
5. Copie os documentos atuais do S3 (na sua máquina, com rclone configurado
   para os dois lados):

```bash
rclone sync aws:psy-manager-documents-lucas/documents r2:psy-manager-documents/documents --progress
```

As `storageKey` gravadas no banco (`documents/<psicologo>/<uuid>.pdf`) continuam válidas.

#### 5. TURN

**Realtime → TURN → Create TURN key**. Anote o *Key ID* (`CF_TURN_KEY_ID`) e o
*API token* (`CF_TURN_API_TOKEN`).

#### 6. GitHub

1. **Settings → Environments → New environment** `production` (opcional:
   exigir sua aprovação antes do deploy).
2. Secrets do environment:
   - `PROD_ENV_FILE`: conteúdo completo de `.env.prod.example` preenchido.
     **Use o mesmo `ENCRYPTION_KEY` de hoje** (pegue no SSM:
     `/psy-manager/prod/ENCRYPTION_KEY`), senão os dados de pacientes não decriptam.
   - `VPS_SSH_HOST` = `ssh.<dominio>`
   - `VPS_SSH_PRIVATE_KEY`: gere uma chave **só para o CI**
     (`ssh-keygen -t ed25519 -f deploy_ci -C github-actions`) e coloque a
     pública no `authorized_keys` do `deploy`.
   - `VPS_SSH_KNOWN_HOSTS`: saída de `ssh-keyscan` rodado *na própria VPS*
     (`ssh-keyscan -t ed25519 localhost | sed 's/^localhost/ssh.<dominio>/'`).
   - `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` (service token do passo 3).
3. Os secrets `VITE_SENTRY_DSN`, `SENTRY_*` continuam como estão.
4. **Google Cloud Console** → OAuth client: adicione
   `https://app.<dominio>/google-callback` e a origem `https://app.<dominio>`.

#### 7. Migração do banco (janela curta de manutenção)

> Faça **depois** do passo 8: o compose e o `.env.prod` só chegam na VPS pelo
> primeiro deploy. O deploy sobe com o banco vazio; este passo o substitui pelo
> dump da EC2.

```bash
# na EC2 (via SSM Session Manager)
docker exec psy-manager-db pg_dump -U postgres -Fc psy_manager > psy.dump
# copie psy.dump para sua máquina e daí para a VPS (scp via ssh.<dominio>)

# na VPS, com o compose já no lugar (passo 8 sobe tudo; para restaurar antes:)
cd ~/psy-manager
docker stop psy-manager-api
docker exec -i psy-manager-db pg_restore -U postgres -d psy_manager --clean --if-exists --no-owner < psy.dump
docker start psy-manager-api
```

#### 8. Primeiro deploy

Faça merge de `chore/sair-da-aws` na `master` (ou rode o workflow *Deploy to
VPS* manualmente pela branch). O pipeline constrói e escaneia as imagens,
publica no GHCR, envia compose + scripts + `.env.prod` e roda o
`scripts/deploy.sh`, que termina com um smoke test em `/api/health`.

Para comandos manuais do Compose na VPS, inclua o arquivo com as imagens em
uso, que o `deploy.sh` grava a cada deploy:

```bash
docker compose --env-file .env.prod --env-file .env.images -f docker-compose.prod.yml logs -f api
```

Depois configure o backup diário (na VPS, `crontab -e` como `deploy`):

```
0 3 * * * bash $HOME/psy-manager/scripts/backup-db.sh >> $HOME/backup.log 2>&1
```

Rode uma vez na mão e **teste a restauração** num Postgres descartável.

#### 9. Desligar a AWS (depois de ~1–2 semanas estável)

1. Pare a EC2 (não termine ainda) e confirme que nada quebrou.
2. Apague: distribuição CloudFront, buckets S3 (frontend e documentos, depois
   de conferir a cópia no R2), repositório ECR, parâmetros `/psy-manager/prod/*`
   do SSM, schedule group `psy-manager-reminders`, função Lambda, roles IAM
   (`psy-manager-github-actions-role`, `psy-manager-ec2-role`,
   `psy-manager-scheduler-role`) e o provedor OIDC do GitHub.
3. Termine a EC2 e apague volumes EBS e Elastic IPs que sobrarem.
4. Feche a conta ou deixe-a vazia com um *AWS Budget* de US$1 alertando por e-mail.
5. Remova os secrets antigos do GitHub (`EC2_INSTANCE_ID`, `CLOUDFRONT_DISTRIBUTION_ID`).

---

### D. Verificação

- `nmap -Pn <ip-da-vps>`: nenhuma porta aberta.
- `curl -I https://app.<dominio>` responde com header `cf-ray`; `curl http://<ip-da-vps>` não responde.
- Login funciona e o cookie sai com `Secure; SameSite=Lax`.
- Upload e download de PDF (vai para o R2).
- Videochamada entre duas redes diferentes (uma no 4G): com o TURN da
  Cloudflare ela conecta mesmo com CGNAT.
- 11+ tentativas de login em 10 s → bloqueio pela regra de rate limit.
- [SSL Labs](https://www.ssllabs.com/ssltest/) com nota A ou A+.
- Restauração de um backup do R2 funciona.

### E. Custos

| Item | Custo |
|---|---|
| VPS Hostinger KVM 1 (12 meses) | ~R$400/ano (~R$33/mês) |
| Domínio | grátis no 1º ano (brinde da Hostinger); depois, a renovação |
| Cloudflare (DNS, proxy, WAF, Tunnel, Access até 50 usuários) | grátis |
| R2 (10 GB, 1M escritas, 10M leituras/mês; egress zero) | grátis no volume atual |
| Realtime TURN | grátis dentro da cota mensal |
