#!/bin/bash
set -euo pipefail

# Runs on the VPS as the `deploy` user, called by .github/workflows/deploy.yml.
# The workflow has already uploaded docker-compose.prod.yml, this script and
# .env.prod (mode 600), and logged Docker in to GHCR.

PROJECT_DIR="$HOME/psy-manager"

# Image digests built and scanned in CI, e.g.
#   ghcr.io/<owner>/psy-manager-api@sha256:...
API_IMAGE="${1:?Usage: deploy.sh <api-image-ref> <web-image-ref>}"
WEB_IMAGE="${2:?Usage: deploy.sh <api-image-ref> <web-image-ref>}"
export API_IMAGE WEB_IMAGE

cd "$PROJECT_DIR"

if [[ ! -f .env.prod ]]; then
    echo "ERROR: $PROJECT_DIR/.env.prod not found." >&2
    exit 1
fi

# Record the deployed images so manual `docker compose` runs on the box (logs,
# restart, exec) resolve ${API_IMAGE}/${WEB_IMAGE} too:
#   docker compose --env-file .env.prod --env-file .env.images -f docker-compose.prod.yml ...
printf 'API_IMAGE=%s\nWEB_IMAGE=%s\n' "$API_IMAGE" "$WEB_IMAGE" > .env.images

COMPOSE=(docker compose --env-file .env.prod --env-file .env.images -f docker-compose.prod.yml)

echo "==> Pulling tested images and starting containers..."
"${COMPOSE[@]}" pull api web
"${COMPOSE[@]}" up -d --remove-orphans

echo "==> Running migrations..."
"${COMPOSE[@]}" exec -T api bun run db:migrate || echo "Migrations: nothing to run"

echo "==> Smoke test (web -> api /api/health)..."
for i in $(seq 1 20); do
    if "${COMPOSE[@]}" exec -T web wget -qO- http://api:3001/api/health >/dev/null 2>&1; then
        echo "API healthy."
        break
    fi
    if [[ "$i" == 20 ]]; then
        echo "ERROR: API did not become healthy." >&2
        "${COMPOSE[@]}" logs --tail 50 api >&2
        exit 1
    fi
    sleep 3
done

echo "==> Pruning old images..."
docker image prune -f >/dev/null

echo "==> Deploy complete."
