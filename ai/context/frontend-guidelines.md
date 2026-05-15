# Frontend Guidelines

## Style And UX

- Keep user-facing strings in Brazilian Portuguese.
- This is a clinical operations app, so favor dense, calm, scannable layouts.
- Use the existing layout system: `AppLayout`, `AppSidebar`, `AppHeader`, and
  `AppSheet`.
- Use lucide-react icons where icons are needed.
- Use existing shadcn/Radix UI primitives from `apps/web/src/components/ui/`.
- Keep forms in side sheets when that matches existing feature behavior.
- Show success/error feedback through Sonner toasts, matching nearby code.

## Feature Structure

Feature modules live under `apps/web/src/features/<feature>/`.

Common pattern:

```text
features/<feature>/
  page.tsx
  index.ts
  components/
```

Prefer extending existing feature folders before creating new global components.

## Data Access

- Use the typed tRPC React client from `apps/web/src/lib/trpc.ts`.
- Use `trpc.<router>.<procedure>.useQuery` for reads.
- Use `trpc.<router>.<procedure>.useMutation` for writes.
- Use `refetch` or `trpc.useUtils().<router>.<procedure>.invalidate()` after
  mutations.
- Keep API data mapping close to the page/component that needs the UI shape.

## Auth

- Use `useSession`, `signIn`, `signUp`, and `signOut` from
  `apps/web/src/lib/auth-client.ts`.
- Protected routes are handled by `AuthGuard`.
- Public-only login behavior is handled by `PublicOnlyGuard`.

## Forms

- Existing auth forms use react-hook-form and Zod.
- Several feature forms use local controlled form state.
- When editing an existing form, follow the local pattern already present.
- Reuse input format helpers from `apps/web/src/utils/format.ts` for Brazilian
  documents and contact fields.

## Uploads

- Use `prepareUpload` tRPC mutations before uploading PDFs.
- Use `uploadFileToTarget` from `apps/web/src/utils/upload.ts`.
- Save metadata and `storageKey` only after upload succeeds.
- The API currently accepts only PDFs up to 10 MB.

## Current Screens

- `AgendamentoPage`: calendar views, stats, appointment CRUD, Google connect/sync.
- `PacientesPage`: patient table, create/edit/delete, navigation to details.
- `PatientDetailsPage`: overview, clinical timeline, new clinical record.
- `FinanceiroPage`: stats, charts, transaction CRUD, CSV import.
- `DocumentosPage`: generic PDF library, view/download/edit/delete.
- `ClinicasPage`: clinic CRUD and professional linking.
- `AuthPage`: login/register.

