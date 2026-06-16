# Sapling Documentation Map

This folder contains project documentation that is meant to help both humans and AI agents understand Sapling without reverse-engineering the codebase every time.

The documentation should stay close to the code, but not duplicate every class or DTO. Prefer stable concepts, contracts, workflows, and "how to extend" guides over generated API dumps.

## Current Docs

- [Project Context For AI Agents](ai/project-context.md)
- [Entity And Metadata System](architecture/entity-metadata.md)
- [Seeders, Migrations, And Reference Data](development/seeding-and-migrations.md)
- [Generic API Contract](api/generic-api.md)
- [Frontend Dynamic UI](frontend/dynamic-ui.md)
- [Permissions And Roles](security/permissions.md)
- [AI, MCP, And Vectorization](ai/ai-mcp-vectorization.md)
- [Inbox And Open Task Notifications](features/inbox-notifications.md)
- [Integrations And Deliveries](integrations/deliveries.md)
- [Testing And Verification](development/testing.md)
- [Refactor Watchlist](development/refactor-watchlist.md)
- [API Refactor Decision Matrix](development/api-refactor-decision-matrix.md)
- [Calendar And Recurrence](features/calendar.md)
- [KPI And Dashboard System](features/kpi-dashboard.md)
- [Scripts And Script Buttons](development/scripts-and-buttons.md)
- [Mail And Teams Communication](features/mail-and-teams.md)
- [Search, Filters, And Saved Views](features/search-filter-saved-views.md)
- [Entity Onboarding Cookbook](development/entity-onboarding-cookbook.md)
- [File Upload And Document Handling](features/file-upload-documents.md)
- [Current User And Open Tasks](features/current-open-tasks.md)
- [Webhook System](integrations/webhooks.md)
- [Authentication, Sessions, And Providers](security/auth-sessions-providers.md)
- [Sapling MCP HTTP API](integrations/sapling-mcp-http.md)
- [Generic Timeline, Change Log, And Record History](features/generic-timeline-change-log-record-history.md)
- [Import Batches And External Record Links](features/imports.md)
- [AI Prompting And Tool Use Guide For Sapling Agents](ai/sapling-agent-tool-use-guide.md)
- [Configurable AI Agents](ai/configurable-agents.md)
- [Operational Runbook](operations/operational-runbook.md)

## Recommended Documentation Set

### 1. Project Knowledge For AI Agents

Suggested file: `docs/ai/project-context.md`

Purpose:

- Give AI tools a compact mental model of Sapling.
- Explain the architectural rules that are not obvious from one file.
- Reduce accidental edits in the wrong layer.

Should include:

- Sapling's core idea: metadata-driven CRM/service platform.
- Backend/frontend split and major folders.
- The generic entity model as the center of the application.
- How decorators, entity registry, templates, routes, translations, permissions, and seeders fit together.
- Conventions for adding a new entity.
- Conventions for migrations and seed files.
- Verification commands.

Audience:

- AI agents first.
- New developers second.

Priority: very high.

### 2. Entity And Metadata System

Suggested file: `docs/architecture/entity-metadata.md`

Purpose:

- Document how `backend/src/entity/*Item.ts`, `entity.registry.ts`, `entity.decorator.ts`, `GenericController`, `GenericService`, and frontend dynamic rendering work together.

Should include:

- Entity handle naming.
- `ENTITY_REGISTRY` responsibility.
- `@Sapling(...)` options and UI effects.
- `@SaplingForm(...)` layout contract.
- `@SaplingDependsOn(...)` relation filtering.
- `@SaplingGenericReference(...)` generic references.
- `@SaplingReferenceTemplate(...)` template field copy behavior.
- How frontend `EntityTemplateDto` drives tables/dialogs.
- Checklist for adding a new entity.

Audience:

- Humans and AI agents.

Priority: very high.

### 3. Seeders, Migrations, And Reference Data

Suggested file: `docs/development/seeding-and-migrations.md`

Purpose:

- Make data evolution predictable.
- Avoid edits to old seed files when new numbered seed files are needed.

Should include:

- `DB_DATA_SEEDER=production|demonstration`.
- `DatabaseSeeder` order and dependency rules.
- Generic seeder naming: `{entityData_NNN.json}`.
- Specialized seeders: translations, permissions, role starters.
- Translation upsert behavior.
- SeedScript tracking.
- When to add a migration.
- When to add new seed files versus changing existing demo data.

Audience:

- Humans and AI agents.

Priority: very high.

### 4. Generic API Contract

Suggested file: `docs/api/generic-api.md`

Purpose:

- Explain Sapling's generic CRUD API without needing to read all generic services.

Should include:

- Endpoints under `/api/generic`.
- Filter format and supported operators.
- Relations parameter.
- Pagination and download behavior.
- Change log and timeline endpoints.
- Permission behavior.
- Sanitization/security behavior.

Audience:

- Frontend developers.
- External integrators.
- AI agents calling generic tools.

Priority: high.

### 5. Frontend Dynamic UI

Suggested file: `docs/frontend/dynamic-ui.md`

Purpose:

- Explain how a backend entity becomes a table, dialog, field renderer, navigation entry, and translated UI.

Should include:

- Router concepts: `table/:entity`, `partner/:entity`, `file/:entity`.
- Generic store and API services.
- Translation loader/store.
- Table composables.
- Dialog edit renderer.
- Field component selection from Sapling options.
- Context menus, scripts, references, markdown, uploads.

Audience:

- Frontend developers and AI agents.

Priority: high.

### 6. Permissions And Roles

Suggested file: `docs/security/permissions.md`

Purpose:

- Document role/entity permission behavior in one place.

Should include:

- Entity capability flags: canRead/canInsert/canUpdate/canDelete/canShow.
- Permission matrix seed structure.
- `PermissionSeeder`.
- Guards: session/bearer, generic permission, admin permission, impersonation read-only.
- How frontend permission metadata is loaded.
- Service-account considerations for MCP/API consumers.

Audience:

- Developers, admins, integrators, AI agents.

Priority: high.

### 7. AI, MCP, And Vectorization

Suggested file: `docs/ai/ai-mcp-vectorization.md`

Purpose:

- Bring together Songbird, MCP tools, vector indexing, providers, and semantic search.

Should include:

- Chat session/message model.
- AI provider and model configuration.
- Internal MCP server versus external MCP configs.
- Tool list and tool guidance.
- Vectorizable entities and indexed fields.
- Vectorization lifecycle.
- How to add a vectorizable entity.
- How semantic search permissions are applied.

Audience:

- Humans and AI agents.

Priority: high.

### 8. Inbox And Open Task Notifications

Suggested file: `docs/features/inbox-notifications.md`

Purpose:

- Document the data-driven inbox model so new entities can participate consistently.

Should include:

- `InboxTemplateItem`, `InboxSubscriptionItem`, `InboxNotificationItem`.
- Current/open task snapshot services.
- Header preview and inbox UI.
- Template placeholders and entity references.
- How to onboard a new entity into inbox notifications.

Audience:

- Feature developers and AI agents.

Priority: medium-high.

### 9. Integrations And Deliveries

Suggested file: `docs/integrations/deliveries.md`

Purpose:

- Explain the common delivery pattern across mail, Teams, calendar, and webhooks.

Should include:

- Templates/subscriptions/deliveries/status entities.
- Queue behavior with Redis/BullMQ.
- Processors and executors.
- Retry and error handling.
- Environment variables.

Audience:

- Developers, operators, AI agents.

Priority: medium.

### 10. Calendar And Recurrence

Suggested file: `docs/features/calendar.md`

Purpose:

- Calendar behavior is complex enough to deserve a stable guide.

Should include:

- Event entity model.
- Recurrence rules.
- Azure/Google calendar integration.
- Event delivery model.
- Frontend calendar drag/create/update behavior.

Audience:

- Humans and AI agents.

Priority: medium.

### 11. KPI And Dashboard System

Suggested file: `docs/features/kpi-dashboard.md`

Purpose:

- Explain how KPI definitions become dashboard cards, trends, drilldowns, and starter dashboards.

Should include:

- KPI entity fields.
- Aggregation/timeframe/type semantics.
- Executor behavior.
- Frontend KPI components.
- Favorite/dashboard templates and role starters.

Audience:

- Humans and AI agents.

Priority: medium.

### 12. Scripts And Script Buttons

Suggested file: `docs/development/scripts-and-buttons.md`

Purpose:

- Document the script-button mechanism and server/client script contracts.

Should include:

- `ScriptButtonItem`.
- `backend/src/script/*Controller.ts`.
- Script result types.
- Client action handling.
- Safety and permission expectations.

Audience:

- Developers and AI agents.

Priority: medium.

### 13. Testing And Verification

Suggested file: `docs/development/testing.md`

Purpose:

- Make verification choices consistent.

Should include:

- Root commands.
- Backend Jest patterns.
- Frontend Vitest patterns.
- Typecheck commands.
- When to run targeted tests versus broader checks.
- Common mock patterns.

Audience:

- Humans and AI agents.

Priority: medium.

## Suggested Order Of Work

1. `docs/ai/project-context.md`
2. `docs/architecture/entity-metadata.md`
3. `docs/development/seeding-and-migrations.md`
4. `docs/api/generic-api.md`
5. `docs/ai/ai-mcp-vectorization.md`
6. `docs/frontend/dynamic-ui.md`
7. `docs/security/permissions.md`

After these seven documents, AI agents should be able to make safer changes without repeatedly rediscovering Sapling's core conventions.

## Documentation Style

- Prefer concise, stable explanations over exhaustive generated references.
- Include file paths for important implementation anchors.
- Include extension checklists for recurring tasks such as "add a new entity".
- Use examples from real Sapling entities.
- Keep AI-facing docs explicit about conventions, side effects, and verification commands.
