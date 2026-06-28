# Task: CI/CD — Build Once, Deploy the Same Artifact (Backend)

Status: implemented (AWS setup pending — see step-by-step.md §15-C)

## Goal

Stop rebuilding the API Docker image on the production EC2 box during deploy.
Build the image **once** in GitHub Actions, scan and (optionally) test that exact
image, push it to a registry by digest, and have EC2 **pull and run that same
digest** instead of `git reset --hard` + `docker compose up --build`.

This brings the backend in line with the "build once, test the same artifact,
deploy the same artifact" principle. The frontend path already follows this
(it builds `dist` once and reuses the uploaded artifact for both S3 and the
desktop release) — this task is about the backend.

Secondary wins: parallelize independent jobs and pin the deployed image by
immutable digest (not a mutable tag).

## Context

Relevant files:

- `.github/workflows/deploy-ec2.yml` — the pipeline. `quality-gate` (tests +
  `build:api`, output discarded), `build-frontend` (needs `quality-gate`),
  `deploy-backend` (SSM → `git reset --hard` → `deploy.sh`), `deploy-frontend`,
  `deploy-desktop`.
- `scripts/deploy.sh` — runs on EC2 via SSM. Fetches secrets from SSM into
  `.env.prod`, then `docker compose -f docker-compose.prod.yml up -d --build
  --force-recreate`, then `db:migrate`. The `--build` is what rebuilds on prod.
- `docker-compose.prod.yml` — `api` service uses `build:` (context `.`,
  `docker/Dockerfile.api`, target `production`) instead of a pre-built `image:`.
- `docker/Dockerfile.api` — multi-stage (`base` → `deps` → `production`).

Existing behavior:

- The API code is unit-tested on the GitHub runner (`bun run test`), but the
  Docker **image** is built fresh on EC2 at deploy time. The tested code and the
  deployed image are produced by two different builds on two different machines.
- `deploy-backend` only `needs: quality-gate`; `build-frontend` also
  `needs: quality-gate` and runs serially after it even though the web build
  does not depend on API tests.
- AWS auth already uses OIDC (`configure-aws-credentials` + role assumption) —
  no static keys to manage.

## Requirements

### 1. Build the API image once in CI

- Add a `build-api-image` job that:
  - Builds `docker/Dockerfile.api` target `production` once.
  - Tags with the commit SHA (`${{ github.sha }}`) — **never a mutable tag like
    `latest`** for the deployed reference.
  - Pushes to a registry. Prefer **Amazon ECR** (OIDC role already exists,
    same region `sa-east-1`, keeps image pull on the private network) over GHCR.
  - Uses GitHub Actions layer caching (`cache-from`/`cache-to: type=gha`) so the
    build is incremental.
  - Outputs the resulting **image digest** (`sha256:...`) for downstream jobs.

### 2. Scan the built image

- Add a Trivy scan against the **built image** (by digest) before push, or after
  push but before deploy.
- Pin Trivy to a specific version (not `@master`).
- Fail the pipeline on `HIGH`/`CRITICAL` vulnerabilities (decide whether to start
  in non-blocking `exit-code: 0` mode and flip to blocking once the baseline is
  clean — document the choice).

### 3. Deploy the exact image (no rebuild on EC2)

- `docker-compose.prod.yml`: replace the `api` service `build:` block with
  `image:` pointing at the registry image **pinned by digest**
  (e.g. `image: <ecr-repo>@sha256:...`), injected via an env var the deploy
  step sets.
- `scripts/deploy.sh`: remove `--build`. The flow becomes: ECR login →
  `docker compose pull api` (or `docker pull <digest>`) → `up -d
  --force-recreate --remove-orphans` → `db:migrate`. Keep the SSM secret-fetch
  into `.env.prod` exactly as is.
- The deploy step passes the digest from step 1 to EC2 (via the SSM
  `send-command` parameters or an SSM parameter) so EC2 runs precisely what CI
  built and scanned.
- Code checkout on EC2 is still needed for `docker-compose.prod.yml`,
  `scripts/`, and migrations — keep the `git fetch`/`reset --hard` for those
  files, but the running API container must come from the pulled digest, not a
  local build.

### 4. Parallelize independent jobs

- Drop the unnecessary `needs: quality-gate` from `build-frontend` so the web
  build runs in parallel with API tests (or restructure so lint/test/build fan
  out and only deploy jobs wait on their respective gates).
- `deploy-backend` must wait on: `quality-gate` (tests pass) **and**
  `build-api-image` + Trivy (image built and clean).

## Constraints

- Keep user-facing text in pt-BR (n/a for this infra task, but no English
  strings leak into product code).
- Do not introduce static AWS access keys — keep OIDC role assumption.
- Do not read, print, or commit `.env`, `.env.prod`, or any SSM secret values.
  Secrets stay fetched on EC2 at deploy time as they are now.
- Do not change the frontend/desktop jobs' artifact flow — they already build
  once and reuse.
- Keep the existing SSM-based deploy mechanism (no new SSH key surface).
- Do not touch unrelated modules.

## Acceptance Criteria

- A push to `master` builds the API image exactly once in CI and pushes it to the
  registry tagged by commit SHA.
- The image deployed to EC2 is referenced by the **digest** of the CI-built
  image; `deploy.sh` no longer runs `docker ... --build` for the API.
- Trivy runs against the built image, pinned to a fixed version, with a
  documented blocking/non-blocking policy for HIGH/CRITICAL findings.
- `build-frontend` no longer serializes behind `quality-gate`; total wall-clock
  for the pipeline drops versus the current serial path.
- `deploy-backend` only runs after both tests and the (scanned) image build
  succeed.
- The API comes up healthy after deploy and migrations run successfully.

## Suggested Verification

```bash
# Workflow lints (actionlint if available) and yaml parses
# Push to a throwaway branch / use workflow_dispatch and confirm:
#   - build-api-image pushes <repo>:<sha> and emits a digest
#   - Trivy step runs and reports
#   - deploy step pulls <repo>@sha256:<digest> on EC2 (check SSM command output)
#   - `docker inspect` on EC2 shows the API container's image digest == CI digest
#   - GET https://<cloudfront-domain>/api/health → 200 after deploy
```
