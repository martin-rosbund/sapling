# Sapling Agent Guide

Start here before changing Sapling. The detailed documentation lives in `docs/`, and the central map is:

```text
docs/README.md
```

## Read First

For almost every task, read these before editing:

- `docs/ai/project-context.md` for the project model and architecture rules.
- `docs/README.md` for the current documentation map.
- `docs/development/entity-onboarding-cookbook.md` when adding or changing entities.
- `docs/api/generic-api.md` when touching generic CRUD, filters, timelines, or exports.
- `docs/frontend/dynamic-ui.md` when touching generated forms, tables, fields, or navigation.
- `docs/security/permissions.md` when touching access control, roles, or security filters.
- `docs/ai/sapling-agent-tool-use-guide.md` when using Sapling MCP or AI tools.
- `docs/operations/operational-runbook.md` for setup, migrations, seeders, queues, storage, logs, and verification.

## Project Shape

Sapling is a metadata-driven CRM/service platform.

- Backend: NestJS, MikroORM, generic entity API, seeders, migrations, integrations.
- Frontend: Vue/Vite, dynamic UI generated from backend entity metadata.
- Data model: entity classes plus Sapling decorators, registry entries, JSON seeders, translations, permissions, and routes.
- AI: Songbird, MCP tools, provider/model records, vectorized long-text content.

## Working Rules

- Prefer existing patterns over new abstractions.
- Check the relevant docs before scanning large areas of code.
- Use `rg` for search.
- Keep changes scoped to the requested feature.
- Do not edit old executed seed files for new reference data; add newly numbered seed files.
- When adding an entity, update entity class, registry, migrations, seeders, translations, routes, and permissions together.
- Respect generic permissions and security decorators.
- Treat `backend/.env` as secret-bearing and `frontend/.env` as browser-exposed.
- Run focused tests/type checks when code changes; for docs-only changes, a link/placeholders check is usually enough.

## Documentation Index

The current docs cover:

- architecture and project context
- entity metadata and onboarding
- migrations and seeders
- generic API, timeline, change log, and record history
- frontend dynamic UI
- permissions, auth, sessions, and providers
- AI, MCP, vectorization, and agent tool use
- inbox/open tasks, calendar, KPI/dashboard, mail/Teams, webhooks, files, search
- operational runbook and testing

If a topic feels unclear, update the matching doc in the same change.

