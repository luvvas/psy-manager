#!/bin/bash
set -euo pipefail

# Daily Postgres backup to Cloudflare R2. Runs on the VPS from cron:
#   0 3 * * * bash $HOME/psy-manager/scripts/backup-db.sh >> $HOME/backup.log 2>&1
#
# Reads BACKUP_* variables from .env.prod. The backup bucket uses its own R2
# token (separate from the app's documents token) and an R2 lifecycle rule
# expires objects after 90 days — retention is not handled here.
#
# Patient PII is already encrypted at the application level; BACKUP_AGE_RECIPIENT
# (optional) additionally encrypts the whole dump with `age`.

PROJECT_DIR="$HOME/psy-manager"
set -a && source "$PROJECT_DIR/.env.prod" && set +a

: "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT not set}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET not set}"
: "${BACKUP_S3_ACCESS_KEY_ID:?BACKUP_S3_ACCESS_KEY_ID not set}"
: "${BACKUP_S3_SECRET_ACCESS_KEY:?BACKUP_S3_SECRET_ACCESS_KEY not set}"

# rclone remote defined through env vars — no config file on disk.
export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ENDPOINT="$BACKUP_S3_ENDPOINT"
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
NAME="db-backups/psy_manager-${STAMP}.sql.gz"

dump() {
    docker exec psy-manager-db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-psy_manager}" | gzip -9
}

if [[ -n "${BACKUP_AGE_RECIPIENT:-}" ]]; then
    NAME="${NAME}.age"
    dump | age -r "$BACKUP_AGE_RECIPIENT" | rclone rcat "r2:${BACKUP_S3_BUCKET}/${NAME}"
else
    dump | rclone rcat "r2:${BACKUP_S3_BUCKET}/${NAME}"
fi

echo "$(date -u +%FT%TZ) backup ok: ${NAME}"
