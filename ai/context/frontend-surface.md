# Frontend Surface

## App Entry And Providers

- `apps/web/src/main.tsx`: creates React root and wraps the app in tRPC, React
  Query, tooltip, router, and toaster providers.
- `apps/web/src/router.tsx`: defines all routes and guards.
- `apps/web/src/lib/trpc.ts`: typed tRPC React client using API `AppRouter`.
- `apps/web/src/lib/auth-client.ts`: Better Auth React client.

## Layout

- `AppLayout`: app shell for authenticated routes.
- `AppSidebar`: module navigation, profile sheet, logout.
- `AppHeader`: page title/action bar.
- `AppSheet`: reusable side-sheet form container.
- `ProfileForm`: current psychologist profile editing.

## Auth

Feature path: `apps/web/src/features/auth/`

- `page.tsx`: login/register tabs, Better Auth email sign-in/sign-up.
- `auth-guard.tsx`: route guard for authenticated/public-only behavior.

## Scheduling

Feature path: `apps/web/src/features/agendamento/`

- `page.tsx`: scheduling dashboard, appointment CRUD, Google connect/sync.
- `components/calendar-dashboard.tsx`: calendar view shell.
- `components/daily-view.tsx`: day view.
- `components/weekly-view.tsx`: week view.
- `components/monthly-view.tsx`: month view.
- `components/appointment-form.tsx`: create/edit appointment form.
- `components/appointment-card.tsx`: calendar appointment card.
- `components/stats-cards.tsx`: appointment stats.
- `components/status-badge.tsx`: status display.
- `types.ts`: frontend appointment types and labels.

## Patients And Clinical Records

Feature path: `apps/web/src/features/pacientes/`

- `page.tsx`: patient list, create/edit/delete, open patient details.
- `page-detalhes.tsx`: patient overview, prontuario tab, financial placeholder.
- `components/patient-form.tsx`: patient registration/edit form.
- `components/patients-table.tsx`: patient table.
- `components/patient-timeline.tsx`: clinical record timeline and PDF viewing.

Patient details uses `DocumentForm` from the documents feature to create
clinical records.

## Finance

Feature path: `apps/web/src/features/financeiro/`

- `page.tsx`: dashboard, tabs, date range, transaction CRUD, CSV import.
- `components/stats-cards.tsx`: financial summary.
- `components/income-chart.tsx`: income chart.
- `components/category-pie-chart.tsx`: category breakdown.
- `components/date-range-picker.tsx`: date filter.
- `components/transaction-form.tsx`: create/edit transaction.
- `components/transactions-table.tsx`: income/expense table.
- `components/csv-importer.tsx`: CSV mapping/import UI.

CSV helpers live in `apps/web/src/utils/csv.ts`.

## Documents

Feature path: `apps/web/src/features/documentos/`

- `page.tsx`: generic document library, upload, view, download, metadata edit,
  delete.
- `components/generic-document-form.tsx`: generic library document form.
- `components/generic-documents-table.tsx`: generic library table.
- `components/document-form.tsx`: patient clinical record/document form.
- `components/documents-table.tsx`: patient-linked document table.

Upload helper: `apps/web/src/utils/upload.ts`

## Clinics

Feature path: `apps/web/src/features/clinicas/`

- `page.tsx`: clinic CRUD and linked psychologist management.
- `components/clinic-form.tsx`: clinic form and linking UI.
- `components/clinics-table.tsx`: clinic table.

## Shared UI And Utilities

- `apps/web/src/components/ui/`: shadcn/Radix UI primitives.
- `apps/web/src/components/data-table.tsx`: reusable data table.
- `apps/web/src/components/date-picker.tsx`: shared date picker.
- `apps/web/src/utils/format.ts`: Brazilian formatting helpers.
- `apps/web/src/hooks/use-mobile.ts`: mobile detection helper.

