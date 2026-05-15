# Current State

Generated on: 2026-05-14

## Repo Snapshot

- Monorepo with `apps/api`, `apps/web`, and `packages/shared`.
- Bun lockfile is present.
- Local `node_modules` is present.
- Drizzle migrations currently run through migration `0006_cultured_spot.sql`.
- Existing public docs include `step-by-step.md` and `next-step.md`.

## Git State At Scan Time

Before this `/ai` folder was created, these files were already modified:

- `apps/web/src/features/documentos/components/generic-documents-table.tsx`
- `apps/web/src/features/pacientes/page-detalhes.tsx`

Treat those as user or pre-existing work unless explicitly told otherwise.

## Known Gaps And Watchpoints

- No test runner or test files were found.
- `packages/shared/src/index.ts` is minimal and may not reflect current auth/user
  types used by the app.
- Patient and appointment writes use CQRS; direct DB writes can bypass event
  history and projections.
- Clinical records have finalization rules; finalized records should stay locked.
- Document and clinical PDF access should go through storage read URLs.
- Clinic membership actions should be reviewed carefully for authorization
  boundaries.
- The documents page currently calls `document.list` with an empty filter; verify
  intended generic-vs-patient filtering before changing document library behavior.

