# Task: Sanitizar Exposições de Infra no Repo Público

Status: draft

## Goal

Reduzir a **superfície de reconnaissance** do repositório (que é **público**),
removendo/templatizando identificadores de infra do working tree. Nenhum desses
itens é credencial — então **não é resposta a vazamento**, é higiene de exposição.

## Contexto e princípio

- Repo `<owner>/<repo>` é **público** no GitHub.
- **Policy/ARN/ID não são credenciais.** O boundary de segurança é a *trust policy*
  + higiene de credencial (segredos via SSM/OIDC — já corretos). Saber um ID não dá
  acesso; mas em repo público é recon que facilita a vida de um atacante se houver
  *outra* falha.
- Logo: a meta é **não publicar identificadores reais sem necessidade**, não
  "esconder a arquitetura" (não dependa de obscuridade).

## ⚠️ Caveat crítico: histórico do Git

Sanitizar os arquivos corrige o **working tree atual**, mas os valores continuam no
**histórico de commits público** (já foi push). Remoção real do histórico exige
`git filter-repo` + `--force` push (quebra clones, disruptivo) — só vale a pena pra
**segredos de verdade**, que aqui **não existem no histórico** (foram via SSM/OIDC).
Conclusão: sanitizar daqui pra frente + limpar o tree é suficiente; reescrever
histórico é overkill pra identificadores não-secretos.

> Regra de ouro: se algum item fosse uma **credencial**, o fix não seria sanitizar —
> seria **rotacionar**. Aqui nenhum é.

## Inventário das exposições (levantamento)

> Valores mascarados de propósito (não reconcentrar no repo).

| # | Identificador | Onde aparece | Severidade | Ação |
|---|---|---|:--:|---|
| 1 | **Account ID** (`9520…`) | `deploy-ec2.yml` (ARNs), `docs/progress/{10,13,14}`, `docs/progress/07` (CloudFront ARN), `ai/tasks/task-key-rotation.md` | 🟠 média | Workflow → mover pra **secret/variable** e montar o ARN; docs/tasks → `ACCOUNT_ID` |
| 2 | **IP público da EC2** (`56.…`) | `docs/progress/00-base-infra.md` | 🟠 média (alvo de scan) | Placeholder `<EC2_PUBLIC_IP>` |
| 3 | **Instance ID** (`i-07…`) | `docs/progress/13-ssm-session-manager.md` | 🟡 baixa-média | Placeholder `<INSTANCE_ID>` |
| 4 | **Volume ID** (`vol-02…`) | `docs/go-to-market/README.md`, `docs/go-to-market/release-plan.md` | 🟡 baixa | Placeholder `<VOLUME_ID>` |
| 5 | **VPC ID** (`vpc-08…`) | `docs/progress/09-redis.md` | 🟡 baixa | Placeholder `<VPC_ID>` |
| 6 | **Nomes de bucket** (`*-lucas`, `*-releases`) | `deploy-ec2.yml`, `scripts/deploy.sh`, `electron-builder.config.js`, vários docs | 🟡 baixa-média | Docs → genérico; código → opcional mover pra var/SSM |
| 7 | **Paths de SSM** (`/psy-manager/prod/*`) | `scripts/deploy.sh`, docs | 🟢 baixa (nomes, não valores) | Opcional (deixar) |
| 8 | **ARNs completos** | workflow, docs, tasks | = item 1 | Resolvido ao tratar o account ID |
| 9 | **E-mail pessoal** (autor) | **só no histórico** de commits (não em arquivos) | 🟡 baixa (PII) | Só via reescrita de histórico — baixa prioridade |

### NÃO são vazamento (deixar como está)

- **Domínio CloudFront** (`*.cloudfront.net`) — é a **URL pública do app**, inerentemente pública.
- **Região** (`sa-east-1`) — não é sensível.
- **Distribution ID do CloudFront** — já está como **GitHub secret**, não hardcoded. ✅
- **Credenciais TURN / segredos** — já no SSM (`SecureString`), fora do repo. ✅

## Requirements

### Prioridade 1 (média severidade)
- **Account ID no workflow** (`deploy-ec2.yml`): criar uma **repository variable**
  (`vars.AWS_ACCOUNT_ID`) ou secret, e trocar os ARNs hardcoded por
  `arn:aws:iam::${{ vars.AWS_ACCOUNT_ID }}:role/...`. Validar que o deploy continua
  assumindo a role (não quebrar OIDC).
- **IP público da EC2** nos docs → `<EC2_PUBLIC_IP>`.

### Prioridade 2 (baixa — docs)
- Trocar instance ID, volume ID, VPC ID por placeholders nos docs.
- Genericizar nomes de bucket nos **docs** (no código é config real — ver P3).

### Prioridade 3 (opcional)
- Mover nomes de bucket no **código** (`deploy.sh`, `electron-builder.config.js`,
  `deploy-ec2.yml`) pra variáveis/SSM, se quiser tirar do tree. Mais invasivo;
  avaliar custo/benefício.
- Paths de SSM: provavelmente deixar (são nomes, não valores).

## Constraints

- **Não quebrar o deploy.** Account ID e bucket names são usados em runtime — mover
  pra secret/var, não apenas deletar. Testar o pipeline depois.
- Não tocar em segredos reais (já estão fora; nada a fazer).
- Não reescrever histórico do Git nesta task (escopo = working tree).
- Manter o `docs/saa-c03/iam-policies.md` como referência templatizada.

## Acceptance Criteria

- `grep` pelo account ID e pelo IP público no working tree não retorna ocorrências
  em arquivos versionados (exceto onde for inevitável e movido pra secret/var).
- O pipeline de deploy continua verde após a mudança do account ID pra variable.
- Docs usam placeholders consistentes (`ACCOUNT_ID`, `<EC2_PUBLIC_IP>`, etc.).
- Itens "não são vazamento" permanecem intactos.

## Suggested Verification

```bash
# não deve achar o account ID nem o IP em arquivos versionados:
git grep -nE '9520[0-9]{8}|56\.125\.[0-9]+\.[0-9]+' || echo "limpo"
# pipeline: push numa branch de teste e confirmar que o deploy assume a role via OIDC
```

## Relacionado

- `docs/saa-c03/iam-policies.md` — catálogo templatizado (já feito)
- `docs/saa-c03/dominio-1-seguranca.md` — contexto de IAM/segurança
- Memória do agente: "Public repo — sanitize IaC"
