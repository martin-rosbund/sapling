# Sapling Project Context

This document is optimized for AI agents and new developers. It describes Sapling's stable mental model, extension rules, and the files that usually matter when making changes.

## What Sapling Is

Sapling is a metadata-driven CRM, service, operations, collaboration, and AI-assistance platform.

Most user-facing business objects are not implemented as one-off CRUD screens. They are MikroORM entities registered in a central registry, exposed through a generic backend API, described through runtime templates, and rendered dynamically in the frontend.

The core idea:

```text
Entity class -> ENTITY_REGISTRY -> Generic API -> Template metadata -> Dynamic frontend UI
```

Seed files, translations, permissions, routes, and form metadata complete the contract.

## Repository Shape

```text
backend/              NestJS API, MikroORM entities, seeders, migrations, integrations
frontend/             Vue 3/Vite client, dynamic UI, stores, services, components
docs/                 Human and AI-readable project documentation
deploy/               Deployment, Docker infrastructure, Nginx, environment examples
README.md             Main project overview
package.json          Root scripts for build, debug, tests, typechecks, ORM
```

Important backend folders:

```text
backend/src/entity/                   Entity model
backend/src/entity/global/            Registry and Sapling decorators
backend/src/api/generic/              Generic CRUD, filters, payloads, permissions, timeline
backend/src/api/template/             Entity template metadata
backend/src/database/migration/       MikroORM migrations
backend/src/database/seeder/          Seeder orchestration and JSON seed data
backend/src/api/ai/                   Songbird, MCP, providers, vectorization
backend/src/auth/                     Authentication and guards
backend/src/script/                   Script-button server controllers
backend/src/calendar/                 Calendar, recurrence, Azure/Google integration
backend/src/api/mail|teams|webhook/   Delivery integrations
```

Important frontend folders:

```text
frontend/src/entity/          Generated/shared TypeScript entity shapes
frontend/src/services/        API clients and error handling
frontend/src/stores/          Pinia stores
frontend/src/views/           Route-level views
frontend/src/components/      UI components
frontend/src/composables/     Feature and generic UI logic
frontend/src/router/          Route definitions and auth guard
frontend/src/utils/           Reusable frontend helpers
```

## Core Backend Concepts

### Entity Classes

Entities live in `backend/src/entity/*Item.ts`.

They use MikroORM decorators for persistence and Sapling decorators for UI/runtime semantics.

Examples:

- `TicketItem`
- `SalesOpportunityItem`
- `EventItem`
- `EffortEstimateItem`
- `InboxTemplateItem`
- `AiVectorDocumentItem`

### Entity Registry

`backend/src/entity/global/entity.registry.ts` maps stable entity handles to classes.

The handle is the cross-layer identifier used by:

- `/api/generic/:entityHandle`
- frontend routes such as `/table/ticket`
- seed folders such as `json-production/ticket`
- translations such as `{ "entity": "ticket", "property": "title" }`
- permissions
- MCP generic tools

### Sapling Decorators

`backend/src/entity/global/entity.decorator.ts` defines custom metadata.

Common examples:

- `@Sapling(['isValue'])`: primary human-readable field.
- `@Sapling(['isMarkdown'])`: render with markdown editor.
- `@Sapling(['isMoney'])`, `isPercent`, `isNumeric`: numeric field variants.
- `@SaplingForm(...)`: dialog grouping, order, width.
- `@SaplingDependsOn(...)`: dependent relation filters.
- `@SaplingGenericReference(...)`: polymorphic entity/handle reference.
- `@SaplingReferenceTemplate(...)`: copy fields from selected template relation.

The frontend receives these options through `TemplateService`.

## Core Frontend Concepts

The frontend relies heavily on backend metadata.

Key dynamic routes:

```text
/table/:entity
/partner/:entity
/file/:entity
```

Key dynamic systems:

- `frontend/src/stores/genericStore.ts`: loads generic entity data.
- `frontend/src/services/api.generic.service.ts`: generic API client.
- `frontend/src/services/translation.service.ts`: translation loading.
- `frontend/src/components/dialog/SaplingDialogEditFieldRenderer.vue`: chooses field components based on template metadata.
- `frontend/src/composables/table/useSaplingTable.ts`: table behavior.

Custom workflow dialogs should still use Sapling's shared UI building blocks:

- `SaplingDialogCard`, `SaplingDialogShell`, and `SaplingDialogHero` for dialog structure.
- `frontend/src/components/actions/*` components for dialog footers such as close/cancel/save.
- `SaplingFieldSingleSelect` and `SaplingFieldSelect` for reference fields instead of raw Vuetify dropdowns.

Reference labels come from target entity metadata and `isValue` templates. Do not guess display fields in custom frontend code; load the target entity metadata early enough for the shared field components to resolve labels.

## Adding A New Entity

Typical backend work:

1. Add `backend/src/entity/NewThingItem.ts`.
2. Register it in `backend/src/entity/global/entity.registry.ts`.
3. Add a migration in `backend/src/database/migration/`.
4. Add seed files for:
   - `entity`
   - `entityRoute`
   - `translation`
   - permissions if the default matrices need changes
   - entity-specific reference/status/demo data
5. Add permissions through `PermissionSeeder` matrices when needed.
6. Add tests if behavior is not purely declarative.

Typical frontend work:

1. Usually no route/component is needed for basic CRUD.
2. Ensure translations are loaded where custom views use the entity.
3. Add field renderer behavior only if a new Sapling option or custom control is needed.
4. Add feature-specific UI only when the generic table/dialog is not enough.

## Data Evolution Rules

- Use migrations for schema changes.
- Use new numbered seed files for new or changed reference data.
- Avoid modifying old production seed files unless correcting an error that has not been released.
- Demonstration seed data can be updated when the goal is better demo realism.
- Translation seed files can override existing translations because `TranslationSeeder` upserts by `entity + property + language`.

## AI And MCP Concepts

Sapling's assistant is Songbird.

Important files:

```text
backend/src/api/ai/ai.service.ts
backend/src/api/ai/ai-chat-runtime.service.ts
backend/src/api/ai/mcp.service.ts
backend/src/api/ai/sapling-mcp.service.ts
backend/src/api/ai/sapling-mcp-tool-definitions.ts
backend/src/api/ai/ai-vector.service.ts
backend/src/api/ai/ai-vector.utils.ts
```

The internal MCP server is exposed over:

```text
/api/ai/mcp
```

Detailed integration docs:

- `docs/integrations/sapling-mcp-http.md`
- `docs/ai/ai-mcp-vectorization.md`

## Verification Commands

Useful root commands:

```bash
npm run type-check:backend
npm run type-check:frontend
npm run type-check
npm run test:backend
npm run test:frontend
npm run verify
```

Targeted backend tests:

```bash
npm test --prefix backend -- <spec-file> --runInBand
```

Targeted frontend tests:

```bash
npm run test:unit --prefix frontend -- <spec-file> --run
```

## AI Agent Rules Of Thumb

- Read the local patterns before adding abstractions.
- New business objects almost always need entity, registry, migration, seed, translation, route, and permission consideration.
- Do not hard-code UI behavior that can be expressed through Sapling metadata.
- Preserve user changes in the working tree.
- Prefer targeted tests plus typechecks for focused changes.
- Keep docs and seed files numbered and additive when possible.
