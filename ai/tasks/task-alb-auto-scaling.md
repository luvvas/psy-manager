# Task: ALB + Auto Scaling — Dashboard Compartilhado da Clínica

Status: draft

## Goal

Two deliverables in one task:

1. **Product feature:** a shared clinic calendar view at `/agendamento` that shows
   appointments from all psychologists who belong to the same clinic, with a
   per-psychologist filter.
2. **Infrastructure upgrade:** move the EC2 instance into an Auto Scaling Group
   behind an Application Load Balancer. CloudFront `/trpc/*` and `/api/*`
   behaviors point to the ALB instead of the EC2 public IP.

**Hard prerequisite:** `task-elasticache-redis` must be deployed first. Sessions
must be stored in Redis before multiple EC2 instances can serve authenticated
traffic.

## Context

Relevant files:

- `apps/api/src/routes/appointment.ts` — appointment list query; already includes
  shared-clinic appointments
- `apps/web/src/features/agendamento/` — calendar views
- `apps/api/src/index.ts` — add `/api/health` health check endpoint
- `.github/workflows/deploy-ec2.yml` — update deploy target from EC2 IP to ALB DNS
- `step-by-step.md` section 9-C — CloudFront behavior configuration reference
- `apps/api/src/db/schema.ts` — `psychologist_clinic` join table already exists

Existing behavior:

- The appointment list query (`appointment.list`) already returns appointments
  from psychologists who share a clinic with the logged-in user (see domain-model).
- The calendar UI at `/agendamento` shows only the logged-in psychologist's own
  appointments.
- CloudFront `/trpc/*` and `/api/*` behaviors currently point directly to the
  EC2 public IP via its `ec2-xxx.compute.amazonaws.com` DNS.

## Requirements

### Product Feature — Shared Clinic Calendar

**API (`apps/api/src/routes/appointment.ts`):**
- Add `appointment.listClinicMembers` query:
  - Input: `clinicId`
  - Returns: list of `{ psychologistId, name }` for all members of the clinic.
- Extend `appointment.list` (or add `appointment.listByClinic`):
  - Input: `{ clinicId?, psychologistIds? }`
  - Returns appointments for the given set of psychologists filtered by the
    caller's clinic membership.

**Frontend (`apps/web/src/features/agendamento/`):**
- Add a **"Clínica"** toggle or tab in the calendar header.
- When active, shows appointments from all clinic members color-coded by
  psychologist.
- A multi-select filter chip list lets the user show/hide specific members.
- Falls back to the current single-user view when the psychologist has no clinic.

### Infrastructure — ALB + Auto Scaling Group

**Health check endpoint:**
Add `GET /api/health` to `apps/api/src/index.ts` returning:

```json
{ "status": "ok" }
```

Status 200. No authentication required.

**AWS Console steps (document in `step-by-step.md`):**

1. Create a Launch Template from the existing EC2 instance (AMI snapshot).
2. Create a Target Group:
   - Protocol: HTTP, Port: 80
   - Health check path: `/api/health`
3. Create an Application Load Balancer:
   - Scheme: internet-facing
   - Listeners: HTTP 80 (redirect to HTTPS 443 if certificate is available)
   - Register the Target Group
4. Create an Auto Scaling Group:
   - Launch Template: step 1
   - Min: 1, Desired: 1, Max: 2
   - Target Group: step 3
5. Create a CloudWatch Alarm:
   - Metric: `CPUUtilization > 70%` for 2 consecutive minutes
   - Action: Add 1 instance to the ASG

**CloudFront update:**
- Change the EC2 origin from the public IP to the ALB DNS name
  (`psy-manager-alb-XXXXX.sa-east-1.elb.amazonaws.com`).
- ALB security group: allow HTTP/HTTPS from CloudFront prefix list only
  (remove direct port 80 access from `0.0.0.0/0`).

**GitHub Actions:**
- Replace the `EC2_HOST` SSH target with the ALB DNS for health checks.
- SSH deploy still connects to the primary EC2 instance directly via its IP
  (stored in a separate `EC2_INSTANCE_IP` secret) because the deploy script
  pulls code and restarts containers on that instance.

## Constraints

- Keep user-facing text in pt-BR.
- Only show clinic members' appointments to a psychologist who is an active
  member of that clinic — do not expose cross-clinic data.
- The health check endpoint must not require authentication.
- Do not remove the EC2 direct SSH access (needed for CI/CD deploys).
- Do not touch unrelated modules.

## Acceptance Criteria

- `GET /api/health` returns `{ "status": "ok" }` with HTTP 200.
- A psychologist who belongs to a clinic can switch to the clinic view and see
  other members' appointments.
- A psychologist with no clinic sees only their own appointments (no regression).
- ALB health checks pass and the Target Group shows the instance as healthy.
- A CloudWatch alarm exists for CPU > 70 % on the ASG.
- CloudFront correctly routes `/trpc/*` and `/api/*` through the ALB.
- `bun run build` passes with no type errors.

## Suggested Verification

```bash
bun run build
# curl https://<cloudfront-domain>/api/health → {"status":"ok"}
# log in as psychologist A (clinic member), switch to clinic view
# log in as psychologist B (same clinic), create an appointment
# verify the appointment appears in A's clinic view
# verify a psychologist with no clinic sees no clinic toggle
```
