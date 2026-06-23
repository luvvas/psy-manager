# Task: Secret Rotation Strategy

Status: in progress

---

## Current State (as of 2026-06-19)

### Where secrets live

| Secret | Dev | Production | Rotatable? | Complexity |
|---|---|---|---|---|
| `DATABASE_URL` / `POSTGRES_PASSWORD` | `.env` | SSM Parameter Store | Yes — RDS + SSM + redeploy | Medium |
| `BETTER_AUTH_SECRET` | `.env` | SSM Parameter Store | Yes — invalidates all sessions | Low |
| `ENCRYPTION_KEY` | `.env` | SSM Parameter Store | **Hard** — must re-encrypt all patient PII | High |
| `GOOGLE_CLIENT_SECRET` | `.env` | SSM Parameter Store | Yes — revoke + regenerate in GCP Console | Low |
| `SMTP_PASS` | `.env` | SSM Parameter Store | Yes — update in email provider + SSM | Low |
| `TURN_CREDENTIAL` | `.env` | SSM Parameter Store | Yes — update coturn + SSM | Low |
| `LAMBDA_CALLBACK_SECRET` | `.env` | SSM Parameter Store | Yes — update SSM + Lambda env + redeploy | Low |
| `META_API_TOKEN` | `.env` | SSM Parameter Store (pending) | Yes — regenerate in Meta Business Manager | Low |
| `EC2_SSH_KEY` | Not used locally | GitHub Actions Secrets | Yes — generate new keypair + update EC2 | Medium |
| `SENTRY_AUTH_TOKEN` | `.env` | GitHub Actions Secrets | Yes — regenerate in Sentry | Low |
| `DISCORD_FEEDBACK_WEBHOOK_URL` | `.env` | SSM Parameter Store | Yes — regenerate in Discord | Low |

### How production secrets reach EC2

1. GitHub Actions SSHes into EC2 via `EC2_SSH_KEY` (GitHub Secret)
2. On EC2, `aws ssm get-parameter --with-decryption` fetches each secret using the **EC2 instance profile** (no keys needed)
3. Writes `.env.prod` on disk → Docker Compose reads it at startup

### IAM setup (as of 2026-06-19)

| Entity | Type | Used by | Permissions |
|---|---|---|---|
| EC2 instance profile | IAM Role | API container (S3, SSM, Scheduler) | `AmazonSSMReadOnlyAccess`, `psy-manager-documents-s3-access`, `psy-manager-db-backups-s3` |
| `psy-manager-github-actions-role` | IAM Role (OIDC) | GitHub Actions CI/CD | S3 frontend + S3 releases + CloudFront invalidation |

---

## Progress

### ✅ Phase 1 — Root user eliminated, IAM setup done

- IAM user created for local CLI access (stops root user usage)
- AWS CLI configured locally with IAM user credentials
- EC2 instance profile confirmed working (SSM + S3 already covered)

### ✅ Phase 2 — GitHub Actions OIDC (no long-lived AWS keys)

**Done:**
- Created GitHub OIDC provider in IAM (`token.actions.githubusercontent.com`)
- Created `psy-manager-github-actions-role` (ARN: `arn:aws:iam::952078551945:role/psy-manager-github-actions-role`)
  - Trust policy: restricted to `repo:luvvas/psy-manager:ref:refs/heads/master`
  - Inline policy `psy-manager-github-actions`: S3 frontend + S3 releases + CloudFront
- Updated `deploy-ec2.yml`:
  - `deploy-frontend` and `deploy-desktop` now use `role-to-assume` with `permissions: id-token: write`
  - Removed `${{ secrets.AWS_ACCESS_KEY_ID }}` and `${{ secrets.AWS_SECRET_ACCESS_KEY }}` from both jobs
- Deleted `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from GitHub Secrets

**Result:** No long-lived AWS credentials stored anywhere in CI/CD. Temporary tokens issued per-run, expire in 1 hour automatically.

### ✅ Phase 3 — Add missing secrets to SSM

Non-sensitive config values hardcoded in the workflow or EC2 that should move to SSM:

```bash
# Move from hardcoded in deploy-ec2.yml to SSM
aws ssm put-parameter --region sa-east-1 \
  --name "/psy-manager/prod/ALLOWED_ORIGINS" \
  --type "String" \
  --value "https://dswfc48bg9ft6.cloudfront.net,app://localhost"

aws ssm put-parameter --region sa-east-1 \
  --name "/psy-manager/prod/BETTER_AUTH_URL" \
  --type "String" \
  --value "https://dswfc48bg9ft6.cloudfront.net"

aws ssm put-parameter --region sa-east-1 \
  --name "/psy-manager/prod/GOOGLE_CLIENT_ID" \
  --type "String" \
  --value "<value>"

aws ssm put-parameter --region sa-east-1 \
  --name "/psy-manager/prod/GOOGLE_REDIRECT_URI" \
  --type "String" \
  --value "https://dswfc48bg9ft6.cloudfront.net/google-callback"
```

New WhatsApp secrets (unblocks reminder feature in production):
```bash
aws ssm put-parameter --region sa-east-1 --name "/psy-manager/prod/META_PHONE_NUMBER_ID"              --type "SecureString" --value "<value>"
aws ssm put-parameter --region sa-east-1 --name "/psy-manager/prod/META_API_TOKEN"                    --type "SecureString" --value "<value>"
aws ssm put-parameter --region sa-east-1 --name "/psy-manager/prod/WHATSAPP_TEMPLATE_NAME"            --type "String"       --value "appointment_reminder"
aws ssm put-parameter --region sa-east-1 --name "/psy-manager/prod/AWS_REMINDER_LAMBDA_ARN"           --type "String"       --value "<value>"
aws ssm put-parameter --region sa-east-1 --name "/psy-manager/prod/AWS_EVENTBRIDGE_SCHEDULER_ROLE_ARN" --type "String"      --value "<value>"
aws ssm put-parameter --region sa-east-1 --name "/psy-manager/prod/API_INTERNAL_URL"                  --type "String"       --value "<value>"
aws ssm put-parameter --region sa-east-1 --name "/psy-manager/prod/LAMBDA_CALLBACK_SECRET"            --type "SecureString" --value "<value>"
```

After adding to SSM, update the `.env.prod` generation block in `deploy-ec2.yml` to fetch them.

### ⏳ Phase 4 — ENCRYPTION_KEY dual-key rotation

**Goal:** Be able to rotate `ENCRYPTION_KEY` without data loss or downtime.

The `ENCRYPTION_KEY` encrypts every patient PII field in the DB (nome, email, telefone, cpf, etc.).
Rotating it with a naive "replace" permanently breaks decryption of all existing data.

#### 4a — Update `encryption.ts` to support a key ring

Store keys in SSM as a JSON array (newest first):
`/psy-manager/prod/ENCRYPTION_KEYS` = `["new_key_base64", "old_key_base64"]`

Update `apps/api/src/lib/encryption.ts`:
- `encrypt()` — always uses the first key (current)
- `decrypt()` — tries each key in order; first success wins
- Keep `ENCRYPTION_KEY` (single string) as legacy fallback if `ENCRYPTION_KEYS` is not set

#### 4b — Rotation procedure (zero downtime)

1. Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. Update SSM: prepend new key to `ENCRYPTION_KEYS` array (old key stays as second element)
3. Deploy — new writes use new key; old reads fall back gracefully
4. Run re-encryption script: `bun run db:reencrypt`
   - Script touches: `patient` (nome, email, telefone, cpf, dataNascimento, rg, nomeSocial, profissao, endereco, cep, contatoEmergencia, respLegal*) and `appointment` (notes)
   - Verifies row count before and after
5. After script completes: remove old key from array in SSM, deploy again

### ⏳ Phase 5 — EC2 SSH key rotation

`EC2_SSH_KEY` is the only remaining long-lived credential in GitHub Secrets.

Rotation procedure:
1. Generate new keypair: `ssh-keygen -t ed25519 -f psy-manager-deploy -C "github-actions"`
2. Add new public key to EC2: `echo "<pubkey>" >> ~/.ssh/authorized_keys`
3. Update `EC2_SSH_KEY` GitHub Secret with new private key
4. Verify a deploy runs successfully
5. Remove old public key from EC2 `~/.ssh/authorized_keys`

### ⏳ Phase 6 — Optional: AWS Secrets Manager for auto-rotation (SAA-C03)

For SAA-C03 learning — Secrets Manager vs SSM, Lambda rotators, RDS integration:

- Migrate `POSTGRES_PASSWORD` from SSM to Secrets Manager
- Enable automatic rotation with the built-in RDS rotator (every 30 days)
- Update `deploy-ec2.yml` to fetch from Secrets Manager for this credential

---

## Automated vs Manual Rotation — Decision Record

### The only credential worth automating: `POSTGRES_PASSWORD`

AWS Secrets Manager has a built-in RDS rotator that makes this seamless:
1. Secrets Manager generates new password
2. Updates it directly in RDS
3. Updates the secret value
4. App fetches the new value on next connection (or on `SecretsManagerClient` call)

No other credential in this stack has this property.

### Why the others stay manual

| Credential | Why NOT automate |
|---|---|
| `ENCRYPTION_KEY` | Rotation requires re-encrypting all patient PII. The real solution is **AWS KMS** — manages key material internally, rotates transparently, no re-encryption needed. Phase 4 (key ring) is a bridge; KMS is the destination. |
| `BETTER_AUTH_SECRET` | Rotation = all active sessions invalidated simultaneously. Needs a human decision about timing (off-peak). |
| `EC2_SSH_KEY` | Better long-term solution: eliminate SSH entirely via **AWS Systems Manager Session Manager** (SSM Sessions) — no key to rotate at all. |
| `META_API_TOKEN` | Lifecycle managed by Meta. Rotation happens in Meta Business Manager, outside AWS. |
| `GOOGLE_CLIENT_SECRET` | Lifecycle managed by GCP. Rotation happens in GCP Console. |
| `SMTP_PASS` | Managed by email provider. Low risk. Manual is sufficient. |
| `LAMBDA_CALLBACK_SECRET` | Low blast radius. Manual rotation + simultaneous SSM + Lambda update. |
| AWS credentials (CI/CD) | **Already eliminated** — OIDC issues temporary tokens per run, expire in 1h. Zero rotation needed. |

### Summary

```
Automate rotation   →  POSTGRES_PASSWORD  (Secrets Manager + RDS rotator)
Eliminate the key   →  AWS credentials    (OIDC ✅ done), SSH key (SSM Sessions, future)
Replace with KMS    →  ENCRYPTION_KEY     (long-term goal, replaces Phase 4)
Manual / external   →  everything else
```

---

## Acceptance Criteria

- [x] Root user no longer used for day-to-day operations
- [x] GitHub Actions uses OIDC — no AWS keys stored in GitHub Secrets
- [x] All config values (`ALLOWED_ORIGINS`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`) fetched from SSM — nothing hardcoded in workflow
- [ ] WhatsApp secrets in SSM and fetched during deploy
- [ ] `ENCRYPTION_KEY` can be rotated without downtime or data loss (Phase 4)
- [ ] `EC2_SSH_KEY` rotation procedure documented and tested (Phase 5)

---

## Notes

- `BETTER_AUTH_SECRET` rotation = all active sessions invalidated. Schedule for off-peak hours.
- `LAMBDA_CALLBACK_SECRET` must be updated in SSM and Lambda env var simultaneously — do in the same deploy.
- Never rotate `ENCRYPTION_KEY` with a one-step replace. Always use the dual-key strategy in Phase 4.
- `CLOUDFRONT_DISTRIBUTION_ID` remains in GitHub Secrets for now — it's not sensitive but keeping it there avoids exposing the distribution ID publicly in the workflow file.
