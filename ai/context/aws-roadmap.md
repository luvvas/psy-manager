# AWS Advanced Roadmap

This document maps the four planned AWS infrastructure upgrades to concrete product
features. Each service has a dedicated task file in `ai/tasks/`.

## Overview

| Order | Service | Feature | Task file | Depends on |
|-------|---------|---------|-----------|------------|
| 1 | S3 Pre-signed URLs | Módulo de Exames | `task-exames-upload.md` | — |
| 2 | Lambda + S3 Events | Validação e notificações de documentos | `task-lambda-s3-events.md` | task-exames-upload |
| 3 | ElastiCache Redis | Cache de pacientes + store de sessão | `task-elasticache-redis.md` | — |
| 4 | ALB + Auto Scaling | Dashboard compartilhado da clínica | `task-alb-auto-scaling.md` | task-elasticache-redis |

## Why This Order

S3 presigned uploads for exams (1) reuse the existing `storage.service.ts`
infrastructure, delivering product value immediately and opening the S3 event
trigger surface used by Lambda (2).

Redis (3) is independent of S3 work and can run in parallel. It is a hard
prerequisite for ALB (4): Better Auth sessions must be stored in a shared Redis
so that any EC2 instance behind the load balancer can validate authenticated
requests.

## Service Summaries

### 1 — S3 Pre-signed URLs: Módulo de Exames

The `/exames` route is currently a coming-soon placeholder. Implementing it
extends the presigned-URL flow already used by `document` and `clinical_record`
to a new `exam` domain. Differences from the existing document upload:

- Accepts JPEG, PNG, and PDF (not PDF-only).
- Records are linked to a patient, never standalone library items.
- Exams are displayed in a gallery inside the patient details page
  (`/pacientes/:id`).

### 2 — Lambda + S3 Events: Validação e Notificações

Two behaviors triggered by `s3:ObjectCreated` on the documents bucket:

**File validation:** Lambda checks that the uploaded object is a valid,
non-password-protected PDF. If invalid, it updates the record status to
`invalid` in RDS and the UI shows a warning badge.

**Upload notification:** When an exam is added under a patient, Lambda sends an
email via AWS SES to the owning psychologist: "Um novo exame foi adicionado ao
prontuário de [Nome do Paciente]." Useful when a staff member or clinic
colleague uploads the file.

Routing uses S3 key prefix: `documents/exams/*` triggers notification,
`documents/*` triggers validation.

### 3 — ElastiCache Redis: Cache + Sessão

Two concerns solved by one Redis instance:

**Lazy-loading cache for patient list:** The patient list is the most-queried
read in the app (appointments, financial, search, documents). Cache TTL of 60 s
per psychologist. Any patient write command invalidates the cache key.

**Shared session store for multi-instance:** Better Auth currently persists
sessions in PostgreSQL. When ALB routes requests across multiple EC2 instances,
the session created on instance A is unknown to instance B. Redis becomes the
shared session backend so all instances read from the same store.

### 4 — ALB + Auto Scaling: Dashboard Compartilhado da Clínica

The existing clinic membership model (`psychologist_clinic`) already links
psychologists to clinics and the appointment query already includes shared-clinic
appointments. The feature builds on top of this:

- Shared weekly/monthly calendar view at `/agendamento?clinica=:id` showing
  slots for all clinic members.
- Filter by individual psychologist within the clinic view.

The infrastructure change:

- EC2 moves into an Auto Scaling Group with min=1, max=2 instances.
- An Application Load Balancer sits in front of the ASG.
- CloudFront `/trpc/*` and `/api/*` behaviors point to the ALB DNS instead of
  the EC2 public IP.
- A CloudWatch alarm on CPU > 70 % triggers scale-out.
- Health check endpoint: `GET /api/health` returning 200.

Requires Redis (service 3) to be in place before deployment.
