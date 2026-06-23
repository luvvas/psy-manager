#!/bin/bash
set -euo pipefail

REGION="sa-east-1"
PROJECT_DIR="/home/ubuntu/psy-manager"

echo "==> Fetching secrets from SSM..."

POSTGRES_PASSWORD=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id "psy-manager/prod/postgres" --query SecretString --output text | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")

cat > "$PROJECT_DIR/.env.prod" << EOF
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/psy_manager
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=psy_manager
BETTER_AUTH_SECRET=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/BETTER_AUTH_SECRET" --with-decryption --query "Parameter.Value" --output text)
GOOGLE_CLIENT_SECRET=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/GOOGLE_CLIENT_SECRET" --with-decryption --query "Parameter.Value" --output text)
STORAGE_DRIVER=s3
AWS_REGION=${REGION}
AWS_DOCUMENTS_BUCKET=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/AWS_DOCUMENTS_BUCKET" --query "Parameter.Value" --output text)
PUBLIC_URL=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/PUBLIC_URL" --query "Parameter.Value" --output text)
TURN_URL=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/TURN_URL" --query "Parameter.Value" --output text)
TURN_USERNAME=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/TURN_USERNAME" --query "Parameter.Value" --output text)
TURN_CREDENTIAL=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/TURN_CREDENTIAL" --with-decryption --query "Parameter.Value" --output text)
ENCRYPTION_KEY=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/ENCRYPTION_KEY" --with-decryption --query "Parameter.Value" --output text)
SENTRY_DSN=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/SENTRY_DSN" --query "Parameter.Value" --output text)
ALLOWED_ORIGINS=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/ALLOWED_ORIGINS" --query "Parameter.Value" --output text)
BETTER_AUTH_URL=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/BETTER_AUTH_URL" --query "Parameter.Value" --output text)
GOOGLE_CLIENT_ID=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/GOOGLE_CLIENT_ID" --query "Parameter.Value" --output text)
GOOGLE_REDIRECT_URI=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/GOOGLE_REDIRECT_URI" --query "Parameter.Value" --output text)
SMTP_HOST=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/SMTP_HOST" --query "Parameter.Value" --output text)
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/SMTP_USER" --query "Parameter.Value" --output text)
SMTP_PASS=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/SMTP_PASS" --with-decryption --query "Parameter.Value" --output text)
SMTP_FROM=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/SMTP_FROM" --query "Parameter.Value" --output text)
DISCORD_FEEDBACK_WEBHOOK_URL=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/DISCORD_FEEDBACK_WEBHOOK_URL" --query "Parameter.Value" --output text)
REDIS_URL=$(aws ssm get-parameter --region "$REGION" --name "/psy-manager/prod/REDIS_URL" --query "Parameter.Value" --output text)
EOF

echo "==> Starting containers..."
cd "$PROJECT_DIR"
set -a && source .env.prod && set +a
docker compose -f docker-compose.prod.yml up -d --build --force-recreate --remove-orphans

echo "==> Running migrations..."
docker compose -f docker-compose.prod.yml exec -T api bun run db:migrate || echo "Migrations: nothing to run"

echo "==> Deploy complete."
