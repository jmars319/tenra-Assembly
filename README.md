# Assembly by Tenra

Assembly by Tenra is an AI-assisted content operations workbench for turning source material into reviewed, human-approved content outputs. It keeps draft generation, review state, approval, export, and provider configuration visible instead of treating content production as a black box.

The system is desktop-first for local workbench use, while the existing web app remains the fuller cloud-backed implementation for auth, Prisma-backed workflows, and hosted API work.

## Operational Purpose

- Convert briefs, notes, and source material into structured draft workflows.
- Keep human review and approval as explicit workflow states.
- Support local drafting and export without requiring a cloud provider.
- Share reusable domain, prompt, and type logic between web and desktop surfaces.

## Design Posture

- AI assistance is a bounded drafting aid, not an autonomous publisher.
- Local model support is available through provider boundaries.
- The desktop surface owns portable workbench import, export, and review loops.
- Hosted-web concerns stay isolated in the web app.
- Shared packages carry product vocabulary and validation rules.

## Architecture

```text
apps/
  webapp/       Next.js, Prisma, auth, API routes, and fuller product behavior
  desktopapp/   Tauri + Rust + React/Vite local content workbench

packages/
  shared-types/ Reusable enums, DTOs, presets, and feature keys
  domain/       Validation helpers, parsers, and audit-label mapping
  prompts/      Shared instruction layering and prompt guidance

docs/           System overview, desktop architecture, repo map, and handoffs
```

## Current State

- The web app remains the broadest product surface.
- The desktop app is a usable local workbench for manual content items, review gates, approvals, Markdown export, and JSON workbench backup/restore.
- Local AI provider support is available through Ollama or OpenAI-compatible endpoints.
- OpenAI-compatible hosted provider support remains available when configured.
- The desktop app does not bundle model weights.

## Deployment Posture

Assembly is currently a mixed local and web codebase. The desktop app is suitable for local operator workflows; the web app owns hosted implementation concerns. Production hardening depends on the chosen deployment target, provider configuration, auth posture, and database setup.

## Working Locally

```bash
pnpm run bootstrap
pnpm run dev:web
pnpm run dev:desktop
pnpm run verify:all
pnpm run doctor
```

For local model drafting, configure the `ASSEMBLY_LOCAL_AI_*` environment values described in the developer guide.

## Direction

- Continue separating local workbench ownership from hosted-web responsibilities.
- Improve source tracking, review ergonomics, and export formats.
- Keep provider configuration explicit and replaceable.
- Preserve human approval as a required operational boundary.

## Related Documentation

- [System Overview](docs/SYSTEM_OVERVIEW.md)
- [Desktop Architecture](docs/DESKTOP_ARCHITECTURE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Repo Map](docs/REPO_MAP.md)
