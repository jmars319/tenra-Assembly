# Desktop Architecture Note

Assembly by Tenra ships two apps in the same monorepo because the existing web app still owns the cloud-backed workflow, while the desktop client now owns a local content workbench and can grow toward the primary surface.

## What remains web-only today

- Auth and session handling
- Prisma schema, migrations, and database access
- Next.js API routes
- GitHub App install/sync flows
- Current hosted deployment path

## What desktop owns today

- Local manual content items
- Draft templates by content type
- Promotion checks through shared validators
- Ready, approved, rejected, and draft state in browser-local desktop storage
- Markdown copy/export for review or handoff

## Why both apps coexist

- The web app is the working cloud-backed product and reference implementation.
- The desktop app is now useful for local content review without forcing a risky rewrite.
- Shared packages let new logic move once and stay reusable.
- Future hosted/admin/client surfaces may still belong on the web.

## Desktop-first local storage plan

- Browser-local desktop persistence is implemented for the current workbench.
- Durable local-first persistence is planned, not fully implemented yet.
- SQLite is the likely first local database.
- Rust should own file access, local DB access, secret storage, and background tasks.
- The frontend should stay focused on editing, approvals, settings, and presentation.

## Sync and cloud posture

- Cloud sync should follow a stable local model, not replace it.
- Future sync should be explicit, auditable, and compatible with human approval workflows.
- The web app remains the authoritative cloud-backed implementation until durable desktop storage and sync are proven.
