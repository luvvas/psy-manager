# Project Brief

## Product

`psy-manager` is a clinic management application for psychologists, with a
Brazilian Portuguese user experience. It helps psychologists manage scheduling,
patients, clinics, finance, documents, and clinical records.

## Primary Users

- Independent psychologists managing their own patient base.
- Psychologists who work in shared clinics and need to see clinic-related
  scheduling across professionals.
- Future clinic/admin users may need shared operational views, but the current
  code primarily authenticates and scopes work around the logged-in psychologist.

## Active Product Modules

- Auth: login and registration with Better Auth email/password.
- Agendamento: calendar scheduling with day/week/month views, Google Calendar
  connection, and Google event import.
- Pacientes: patient list, patient form, details page, and clinical record
  timeline.
- Prontuario: patient-specific clinical records with draft/finalized status and
  PDF attachments.
- Financeiro: cash flow, income/expense transactions, stats, charts, date range
  filters, and CSV import.
- Documentos: generic document/model library with PDF upload, viewing, download,
  metadata edits, and deletion.
- Clinicas: clinic CRUD and linking/unlinking psychologists by email.
- Perfil: psychologist profile editing from the app sidebar.

## Planned Or Placeholder Modules

- Pagamentos: currently a coming-soon page.
- Exames: currently a coming-soon page.
- Buscar Psicologos: currently a coming-soon page.
- Configuracoes: currently a coming-soon page.
- Patient-specific financial tab exists as a placeholder on the patient details
  page.

## Product Principles

- User-facing language should stay `pt-BR`.
- The app is operational software, so screens should be practical, scannable,
  and efficient.
- Clinical and document data should be treated as private by default.
- Most data is scoped to the authenticated psychologist.
- Shared clinic behavior exists mainly around appointments and clinic membership.

## Important Source Areas

- Web routes: `apps/web/src/router.tsx`
- Web layout: `apps/web/src/components/layout/`
- Web features: `apps/web/src/features/`
- API entry point: `apps/api/src/index.ts`
- tRPC root router: `apps/api/src/routes/router.ts`
- Database schema: `apps/api/src/db/schema.ts`
- CQRS/event sourcing: `apps/api/src/lib/cqrs/` and `apps/api/src/cqrs/`
- Storage service: `apps/api/src/services/storage.service.ts`
- Deployment notes: `step-by-step.md`, `next-step.md`, `.github/workflows/deploy-ec2.yml`

