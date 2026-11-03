# Task: Rotação de segredos (VPS + Cloudflare)

Status: ready

> Reescrita em 2026-11-03 após a saída da AWS. A versão anterior (SSM, OIDC, IAM,
> Secrets Manager, KMS) está no histórico do git e não se aplica mais.

## Goal

Ter, para cada segredo de produção, um procedimento de rotação escrito e testado, e
conseguir rotacionar `ENCRYPTION_KEY` sem perder dados nem derrubar o app.

## Onde os segredos vivem hoje

- **App (runtime):** um único secret `PROD_ENV_FILE` no environment `production` do
  GitHub (formato em `.env.prod.example`). O deploy grava em `~/psy-manager/.env.prod`
  (modo 600) na VPS. Rotacionar = editar o secret + push em `master` (ou
  `workflow_dispatch`).
- **CI (deploy):** secrets do environment `production` — `VPS_SSH_PRIVATE_KEY`,
  `VPS_SSH_KNOWN_HOSTS`, `VPS_SSH_HOST`, `CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET`
  (service token do Cloudflare Access). Build: `SENTRY_AUTH_TOKEN`, `VITE_SENTRY_DSN`.
  GHCR usa o `GITHUB_TOKEN` efêmero do job (nada a rotacionar).
- **Na VPS, fora do repo:** token do `cloudflared` (Tunnel), chave privada do `age`
  dos backups (só a pública, `BACKUP_AGE_RECIPIENT`, vai no env).

## Inventário

| Segredo | Onde | Impacto de rotacionar | Como |
|---|---|---|---|
| `POSTGRES_PASSWORD` / `DATABASE_URL` | `PROD_ENV_FILE` | Curto downtime da API | `ALTER USER` no container `db` → atualizar os dois valores → deploy |
| `BETTER_AUTH_SECRET` | `PROD_ENV_FILE` | Derruba todas as sessões | Gerar novo → deploy fora do horário de atendimento |
| `ENCRYPTION_KEY` | `PROD_ENV_FILE` | **Perde todo PII** se trocado direto | Ver fase 2 (key ring + re-encriptação) |
| `S3_ACCESS_KEY_ID`/`SECRET` (docs) | `PROD_ENV_FILE` | Nenhum, se feito em ordem | Criar token R2 novo (escopo: só o bucket) → deploy → revogar o antigo |
| `BACKUP_S3_*` | `PROD_ENV_FILE` | Nenhum | Igual ao de cima; testar `scripts/backup-db.sh` manual |
| Chave privada `age` | VPS / cofre pessoal | Backups antigos só abrem com a antiga | Nova chave → novo recipient; **guardar a antiga** até os backups dela expirarem (90 dias) |
| `CF_TURN_API_TOKEN` | `PROD_ENV_FILE` | Chamadas em andamento seguem; novas usam o novo | Gerar no painel Realtime → deploy → revogar |
| `GOOGLE_CLIENT_SECRET` | `PROD_ENV_FILE` | Nenhum (GCP aceita dois secrets) | Adicionar secret novo no GCP → deploy → remover o antigo |
| `SMTP_PASS` | `PROD_ENV_FILE` | E-mails falham entre a troca e o deploy | Trocar no provedor e deploy em seguida |
| `DISCORD_FEEDBACK_WEBHOOK_URL` | `PROD_ENV_FILE` | Nenhum | Novo webhook → deploy → apagar o antigo |
| `VPS_SSH_PRIVATE_KEY` | GitHub | Nenhum | Nova chave ed25519 → `authorized_keys` do usuário `deploy` → secret → deploy de teste → remover a antiga |
| Service token do Access | GitHub | Nenhum | Criar token novo → adicionar à policy "CI" → secret → deploy de teste → revogar |
| Token do Tunnel | VPS | Queda do app durante a troca | Só em caso de vazamento: *Refresh token* no painel e `cloudflared service install <novo>` |
| `SENTRY_AUTH_TOKEN` | GitHub | Nenhum | Gerar no Sentry → secret |

## Requirements

### Fase 1 — Procedimentos (documentação)

- Transformar a tabela acima em runbook em `docs/progress/` (passo a passo de cada linha),
  validando cada comando contra a VPS real.
- Registrar a data da última rotação de cada segredo (no runbook, sem os valores).

### Fase 2 — `ENCRYPTION_KEY` com key ring

`apps/api/src/lib/encryption.ts` só aceita uma chave (`ENCRYPTION_KEY`), e
`apps/api/src/lib/env-check.ts` valida esse formato no boot.

1. Aceitar `ENCRYPTION_KEYS` (lista separada por vírgula, a mais nova primeiro):
   `encrypt()` usa sempre a primeira; `decrypt()` tenta em ordem. `ENCRYPTION_KEY`
   continua funcionando como fallback de uma chave só. Ajustar `env-check.ts`.
2. Script `bun run db:reencrypt` que relê e regrava os campos criptografados de
   `patient` e `appointment` com a chave atual, conferindo contagem antes/depois.
   Atenção: paciente e agendamento são CQRS — decidir se o script regrava projeção e
   eventos, e documentar.
3. Procedimento: gerar chave → `ENCRYPTION_KEYS=nova,antiga` → deploy → backup →
   `db:reencrypt` → remover a antiga → deploy.

## Constraints

- Nunca colocar valores reais no repo (é público) nem em logs do CI.
- Fazer backup (`scripts/backup-db.sh`) antes de qualquer rotação que toque o banco.
- Não trocar `ENCRYPTION_KEY` em um passo só.

## Acceptance Criteria

- [ ] Runbook de rotação em `docs/progress/` cobre todas as linhas do inventário.
- [ ] `ENCRYPTION_KEYS` com duas chaves decripta dados das duas; testes cobrindo isso.
- [ ] `db:reencrypt` testado num dump restaurado localmente antes de rodar em produção.

## Suggested Verification

```bash
bun run test:api
# local: restaurar dump, rodar com ENCRYPTION_KEYS=nova,antiga, db:reencrypt,
# remover a antiga e conferir que pacientes continuam legíveis
```
