# Entity Onboarding Cookbook

This cookbook describes the practical path for adding a new Sapling entity from backend model to visible UI. Use it together with the entity metadata, seeding, permissions, and frontend dynamic UI docs.

## Goal

A fully onboarded entity usually has:

- an `*Item.ts` entity class
- an entry in `ENTITY_REGISTRY`
- database migration when schema changes
- entity seed data
- entity route seed data
- translations
- permissions
- optional reference/status/template seed data
- optional script controller
- optional inbox, Teams, webhook, KPI, or AI vectorization participation
- frontend route visibility through generic table/partner/file views
- focused tests for risky behavior

## 1. Model The Entity

Create the entity in:

```text
backend/src/entity/<Name>Item.ts
```

Use existing entities as style references. A typical entity should:

- use `@Entity()`
- use `handle` as the primary key
- mark display fields with `@Sapling(['isValue'])`
- define form layout with `@SaplingForm(...)`
- use `@Sapling(['isReadOnly', 'isSystem'])` for `createdAt` and `updatedAt`
- use `Rel<T>` for MikroORM relations where the codebase already does that
- use `@SaplingDependsOn(...)` for dependent relation fields
- use `@Sapling(['isMarkdown'])` for markdown text areas
- use specialized decorators only when the frontend already supports them

Good examples:

```text
backend/src/entity/TicketItem.ts
backend/src/entity/SalesOpportunityItem.ts
backend/src/entity/EventItem.ts
backend/src/entity/EffortEstimateItem.ts
```

## 2. Register The Entity

Add the entity to:

```text
backend/src/entity/global/entity.registry.ts
```

The registry handle is the stable Sapling entity handle. It is used by:

- generic API routing
- template generation
- permissions
- seeders
- frontend dynamic UI
- MCP/entity schema tools
- vectorization and integrations when enabled

Do not change an existing handle casually. Handles are part of persisted seed data and URLs.

## 3. Add A Migration

Add a migration when the database schema changes:

```text
backend/src/database/migration/MigrationYYYYMMDDHHMMSS.ts
```

Schema changes include:

- new table
- new column
- changed type/length/nullability
- new relation/foreign key
- removed table or column

Do not add a migration for pure seed changes, translations, permission changes, or frontend-only behavior.

## 4. Add Entity Seed Data

Add entity metadata in a new numbered file:

```text
backend/src/database/seeder/json-production/entity/entityData_XXX.json
backend/src/database/seeder/json-demonstration/entity/entityData_XXX.json
```

Set the capability flags intentionally:

| Flag | Meaning |
| --- | --- |
| `canRead` | Entity can be read through generic APIs |
| `canInsert` | Entity can be created |
| `canUpdate` | Entity can be edited |
| `canDelete` | Entity can be deleted |
| `canShow` | Entity can be shown in navigation/UI |

Use demonstration seed files for rich sample records. Use production seed files for reference data and default configuration.

## 5. Add Routes

Add an entity route in a new numbered file:

```text
backend/src/database/seeder/json-production/entityRoute/entityRouteData_XXX.json
backend/src/database/seeder/json-demonstration/entityRoute/entityRouteData_XXX.json
```

Common route patterns:

```text
table/<entityHandle>
partner/<entityHandle>
file/<entityHandle>
```

The route should match an existing frontend route. For most entities, start with `table/<entityHandle>`.

## 6. Add Translations

Add translations in a new numbered file:

```text
backend/src/database/seeder/json-production/translation/translationData_XXX.json
backend/src/database/seeder/json-demonstration/translation/translationData_XXX.json
```

Include at least:

- `navigation.<entityHandle>`
- entity field labels
- form group labels
- status/reference labels when needed
- action labels when user-visible

`TranslationSeeder` upserts by entity, property, and language. Prefer adding new files over editing old numbered files unless you are correcting bad seed data intentionally.

## 7. Add Permissions

Update:

```text
backend/src/database/seeder/permission-matrices.ts
```

Choose role access deliberately. For a user-facing entity, decide:

- who can read it
- who can insert it
- who can update it
- who can delete it
- whether admins only should manage configuration entities

Then run or review the permission seeder output in a test database.

## 8. Add Reference Data

If the entity needs statuses, types, categories, templates, or item positions, create those entities and seed files separately.

Examples:

```text
ticketStatus
eventType
effortEstimateStatus
effortEstimatePositionTemplate
```

Use stable handles for reference data. Demonstration records may be more descriptive and varied, but reference handles should not be churned.

## 9. Wire Optional Systems

Only add optional integration points when they are part of the feature.

| System | When to use | Main docs |
| --- | --- | --- |
| Script buttons | Row/context menu action | `docs/development/scripts-and-buttons.md` |
| Inbox | User should receive notifications/open tasks | `docs/features/inbox-notifications.md` |
| Teams | Lifecycle notification to a person | `docs/features/mail-and-teams.md` |
| Webhooks | External system needs lifecycle payloads | `docs/integrations/deliveries.md` |
| KPI | Entity should appear in dashboards | `docs/features/kpi-dashboard.md` |
| AI vectorization | Markdown/text should be searchable semantically | `docs/ai/ai-mcp-vectorization.md` |
| Calendar | Entity creates or links to events | `docs/features/calendar.md` |

Keep optional wiring in separate numbered seed files where possible.

## 10. Check Frontend Rendering

Most entity UI comes from metadata, but you still need to verify:

- table route loads
- create dialog opens
- edit dialog saves
- relation fields show correct labels
- dependent selects filter correctly
- markdown fields render as markdown editors
- numeric/date/boolean fields use correct controls
- navigation label is translated
- permissions hide disallowed actions

If the entity needs custom UI, add it deliberately instead of overloading generic decorators.

## 11. Add Tests

Test based on risk:

| Change | Suggested tests |
| --- | --- |
| Entity only | backend typecheck and migration check |
| New generic behavior | generic service/filter tests |
| Decorator/UI behavior | frontend field/table tests |
| Scripts | script controller tests |
| Inbox/Teams/webhook | service tests plus seeder smoke check |
| Vectorization | AI vector service tests |

## Minimal File Checklist

For a normal entity:

```text
backend/src/entity/<Name>Item.ts
backend/src/entity/global/entity.registry.ts
backend/src/database/migration/MigrationYYYYMMDDHHMMSS.ts
backend/src/database/seeder/json-production/entity/entityData_XXX.json
backend/src/database/seeder/json-demonstration/entity/entityData_XXX.json
backend/src/database/seeder/json-production/entityRoute/entityRouteData_XXX.json
backend/src/database/seeder/json-demonstration/entityRoute/entityRouteData_XXX.json
backend/src/database/seeder/json-production/translation/translationData_XXX.json
backend/src/database/seeder/json-demonstration/translation/translationData_XXX.json
backend/src/database/seeder/permission-matrices.ts
```

For demo data:

```text
backend/src/database/seeder/json-demonstration/<entityHandle>/<entityHandle>Data_001.json
```

For reference data:

```text
backend/src/entity/<ReferenceName>Item.ts
backend/src/database/seeder/json-production/<referenceHandle>/<referenceHandle>Data_001.json
backend/src/database/seeder/json-demonstration/<referenceHandle>/<referenceHandle>Data_001.json
```

## Verification

Useful baseline commands:

```powershell
npm run type-check:backend
npm run type-check:frontend
npm test --prefix backend -- generic-filter.service.spec.ts generic-read.service.spec.ts --runInBand
```

Also run the targeted tests for any optional systems you touched. After seeding a test database, open the entity through its route and perform one create/edit/read workflow.
