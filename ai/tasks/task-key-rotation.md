# Task: Secret Rotation Strategy

Status: draft

## Current State (as-audited)

### Where secrets live today

| Secret | Dev | Production | Rotatable? | Complexity |
|---|---|---|---|---|
| `DATABASE_URL` / `POSTGRES_PASSWORD` | `.env` | SSM Parameter Store | Yes — RDS + SSM + redeploy | Medium |
| `BETTER_AUTH_SECRET` | `.env` | SSM Parameter Store | Yes — invalidates all sessions | Low |
| `ENCRYPTION_KEY` | `.env` | SSM Parameter Store | **Hard** — must re-encrypt all patient PII | High |
| `GOOGLE_CLIENT_SECRET` | `.env` | SSM Parameter Store | Yes — revoke + regenerate in GCP Console | Low |
| `SMTP_PASS` | `.env` | SSM Parameter Store | Yes — update in email provider + SSM | Low |
| `TURN_CREDENTIAL` | `.env` | SSM Parameter Store | Yes — update coturn + SSM | Low |
| `LAMBDA_CALLBACK_SECRET` | `.env` | SSM Parameter Store | Yes — update SSM + Lambda env + redeploy | Low |
| `META_API_TOKEN` | `.env` | SSM Parameter Store | Yes — regenerate in Meta Business Manager | Low |
| `AWS_ACCESS_KEY_ID/SECRET` | Not used locally | **GitHub Actions Secrets** | Yes — rotate IAM user keys | Medium |
| `EC2_SSH_KEY` | Not used locally | **GitHub Actions Secrets** | Yes — generate new keypair + update EC2 | Medium |
| `SENTRY_AUTH_TOKEN` | `.env` | GitHub Actions Secrets | Yes — regenerate in Sentry | Low |
| `DISCORD_FEEDBACK_WEBHOOK_URL` | `.env` | SSM Parameter Store | Yes — regenerate in Discord | Low |

### How production secrets reach EC2 today

1. GitHub Actions SSH into EC2 using credentials stored in GitHub Secrets
2. GitHub Actions fetches every secret from SSM via `aws ssm get-parameter --with-decryption`
3. Writes a plain-text `.env.prod` file on disk at `~/psy-manager/.env.prod`
4. Docker Compose reads `.env.prod` at container startup

**Current gap:** No rotation automation exists. All rotation is manual.
**Highest risk:** `ENCRYPTION_KEY` — rotating it without a strategy would permanently break decryption of all patient PII stored in the database.

---

## Rotation Groups

Secrets fall into three groups by rotation strategy:

### Group A — Simple rotation (SSM update + redeploy)
New value → update SSM → push to master → GitHub Actions redeploys → done.

- `BETTER_AUTH_SECRET` (side effect: all users get logged out)
- `SMTP_PASS`
- `TURN_CREDENTIAL`
- `LAMBDA_CALLBACK_SECRET` (must update Lambda env var and SSM simultaneously)
- `META_API_TOKEN`
- `GOOGLE_CLIENT_SECRET`
- `DISCORD_FEEDBACK_WEBHOOK_URL`

### Group B — Infrastructure rotation (IAM / EC2 keypair)
Requires updating GitHub Actions secrets, not SSM.

- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — create new IAM access key, add to GitHub Secrets, verify CI works, then delete old key in IAM
- `EC2_SSH_KEY` — generate new keypair, add public key to EC2 `~/.ssh/authorized_keys`, update GitHub Secret, remove old public key

### Group C — Data-safe key rotation (requires re-encryption job)
The `ENCRYPTION_KEY` encrypts every patient PII field in the DB (nome, email, telefone, cpf, dataNascimento, etc.). Rotating it **without a strategy corrupts all data**.

Safe rotation requires a dual-key period:
1. Generate `ENCRYPTION_KEY_V2`
2. Store both `ENCRYPTION_KEY` (old) and `ENCRYPTION_KEY_V2` (new) in SSM
3. Update `encryption.ts` to: decrypt with V1 → re-encrypt with V2 on write (lazy migration), OR run a one-off re-encryption script
4. After all rows are migrated to V2, remove `ENCRYPTION_KEY` from SSM
5. Rename `ENCRYPTION_KEY_V2` → `ENCRYPTION_KEY` in SSM

---

## Implementation Plan

### Phase 1 — Add missing secrets to SSM (unblocks WhatsApp reminder feature)

New secrets from `task-whatsapp-reminder.md` that are not yet in SSM:

```bash
aws ssm put-parameter --name "/psy-manager/prod/META_PHONE_NUMBER_ID"          --type "SecureString" --value "<value>"
aws ssm put-parameter --name "/psy-manager/prod/META_API_TOKEN"                 --type "SecureString" --value "<value>"
aws ssm put-parameter --name "/psy-manager/prod/WHATSAPP_TEMPLATE_NAME"         --type "String"       --value "appointment_reminder"
aws ssm put-parameter --name "/psy-manager/prod/AWS_REMINDER_LAMBDA_ARN"        --type "String"       --value "<value>"
aws ssm put-parameter --name "/psy-manager/prod/AWS_EVENTBRIDGE_SCHEDULER_ROLE_ARN" --type "String"   --value "<value>"
aws ssm put-parameter --name "/psy-manager/prod/API_INTERNAL_URL"               --type "String"       --value "<value>"
aws ssm put-parameter --name "/psy-manager/prod/LAMBDA_CALLBACK_SECRET"         --type "SecureString" --value "<value>"
```

Also add these already-used secrets that may be missing from SSM:
```bash
aws ssm put-parameter --name "/psy-manager/prod/BETTER_AUTH_SECRET"  --type "SecureString" --value "<value>"
aws ssm put-parameter --name "/psy-manager/prod/ALLOWED_ORIGINS"     --type "String"       --value "<value>"
```

Update `deploy-ec2.yml` to fetch and export all of these in the `.env.prod` generation step.

### Phase 2 — Migrate AWS credentials from IAM User to IAM Role (OIDC)

**Current problem:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are long-lived IAM user credentials stored in GitHub Actions. These never auto-expire and are the hardest Group B secret to rotate.

**Better approach — GitHub Actions OIDC (no long-lived keys):**
1. Create an IAM Role with a trust policy that allows GitHub Actions OIDC provider to assume it
2. Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from GitHub Secrets entirely
3. Use `aws-actions/configure-aws-credentials` with `role-to-assume` instead of static keys
4. The temporary credentials are issued per-run and expire after 1 hour — no rotation needed

This is an SAA-C03 topic: **IAM Role assumption via OIDC federation**.

```yaml
# In deploy-ec2.yml, replace:
- uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: sa-east-1

# With:
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::ACCOUNT_ID:role/psy-manager-github-actions-role
    aws-region: sa-east-1
```

IAM trust policy for the role:
```json
{
  "Principal": {
    "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/psy-manager:ref:refs/heads/master"
    }
  }
}
```

### Phase 3 — ENCRYPTION_KEY dual-key rotation

**Goal:** Be able to rotate `ENCRYPTION_KEY` without data loss or downtime.

#### 3a — Update `encryption.ts` to support multiple keys

Store a key ring in SSM: `/psy-manager/prod/ENCRYPTION_KEYS` as a JSON array `["key_v2_base64", "key_v1_base64"]` (newest first).

Update `encryption.ts`:
- `encrypt(plaintext)` — always encrypts with the first key (current)
- `decrypt(ciphertext)` — tries each key in order; first one that succeeds wins
- Cache the parsed key ring in memory (same pattern as current `_keyCache`)

Env var changes:
- Replace `ENCRYPTION_KEY` (single) with `ENCRYPTION_KEYS` (JSON array, first = current)
- Keep `ENCRYPTION_KEY` supported as a legacy fallback (single-key case)

#### 3b — One-off re-encryption script

When keys are rotated:
1. Add the new key as first element of `ENCRYPTION_KEYS` in SSM
2. Deploy (all new writes now use new key; old reads fall back to old key — zero downtime)
3. Run the re-encryption script to migrate all existing rows:
   ```bash
   bun run db:reencrypt
   ```
4. After script completes: remove old key from the array in SSM, deploy again

Script touches: `patient` (nome, email, telefone, cpf, dataNascimento, rg, nomeSocial, profissao, endereco, cep, contatoEmergencia, respLegal*) and `appointment` (notes).

### Phase 4 — Optional: AWS Secrets Manager for auto-rotation (SAA-C03)

AWS Secrets Manager supports automatic rotation via Lambda rotators (built-in for RDS, custom for others). For SAA-C03 learning, the most educational setup:

- Migrate `POSTGRES_PASSWORD` from SSM to Secrets Manager
- Enable automatic rotation (built-in RDS rotator, every 30 days)
- Update `deploy-ec2.yml` to fetch from Secrets Manager instead of SSM for this credential
- Update `apps/api/src/db/index.ts` to optionally fetch the DB URL from Secrets Manager at startup (rather than baking it into `.env.prod`)

SAA-C03 topics covered: Secrets Manager vs SSM Parameter Store (cost vs features), automatic rotation, Lambda rotators, RDS integration.

---

## Relevant Files

- `.github/workflows/deploy-ec2.yml` — fetch secrets from SSM, pass to EC2
- `apps/api/src/load-env.ts` — dotenv loader (dev only)
- `apps/api/src/lib/encryption.ts` — AES-256-GCM key cache and encrypt/decrypt
- `apps/api/src/db/index.ts` — DATABASE_URL consumer
- `apps/api/src/lib/auth.ts` — BETTER_AUTH_SECRET consumer
- `apps/api/src/services/email.service.ts` — SMTP_PASS consumer
- `apps/api/src/services/reminder-scheduler.service.ts` — AWS SDK (uses EC2 instance role, no explicit keys)

## Acceptance Criteria

- [ ] All new WhatsApp secrets are in SSM and fetched during deploy (Phase 1)
- [ ] GitHub Actions uses OIDC role assumption — `AWS_ACCESS_KEY_ID` deleted from GitHub Secrets (Phase 2)
- [ ] `ENCRYPTION_KEY` can be rotated without downtime or data loss (Phase 3)
- [ ] Re-encryption script verifies row count before and after (Phase 3b)
- [ ] All `SecureString` SSM parameters use a customer-managed KMS key (not the default AWS-managed key)

## Notes

- `BETTER_AUTH_SECRET` rotation = all active sessions invalidated (users get logged out). Schedule for off-peak hours.
- `LAMBDA_CALLBACK_SECRET` rotation requires updating **both** SSM (for the API) and the Lambda environment variable simultaneously before redeploying. Do these in the same deployment pipeline step.
- Never rotate `ENCRYPTION_KEY` with a one-step "replace" — always use the dual-key strategy in Phase 3. A wrong rotation permanently makes all patient data unreadable.
