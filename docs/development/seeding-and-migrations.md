# Seeders, Migrations, And Reference Data

Sapling uses MikroORM migrations for schema changes and JSON seed files for reference data, navigation metadata, translations, permissions, and demonstration content.

## Runtime Seed Dataset

The active seed dataset is selected by:

```text
DB_DATA_SEEDER=production
DB_DATA_SEEDER=demonstration
```

Seed files live under:

```text
backend/src/database/seeder/json-production/
backend/src/database/seeder/json-demonstration/
```

The same entity folder structure exists in both environments where needed.

## Seeder Entry Point

Main file:

```text
backend/src/database/seeder/DatabaseSeeder.ts
```

`SEED_ORDER` defines the execution order. Order matters because many seed files reference rows created earlier.

Examples:

- `LanguageItem` must exist before `TranslationSeeder`.
- `EntityGroupItem` must exist before `EntityItem`.
- `EntityItem` must exist before `EntityRouteItem` and `PermissionSeeder`.
- Status/type/reference entities should exist before records that reference them.

## Generic Seeder

Most entities use:

```text
backend/src/database/seeder/GenericSeeder.ts
```

For an entity handle `ticket`, the generic seeder reads:

```text
backend/src/database/seeder/json-production/ticket/ticketData_001.json
backend/src/database/seeder/json-demonstration/ticket/ticketData_001.json
```

Naming pattern:

```text
{entityHandle}/{entityHandle}Data_NNN.json
```

Examples:

```text
entity/entityData_001.json
entityRoute/entityRouteData_006.json
effortEstimate/effortEstimateData_001.json
translation/translationData_016.json
```

## SeedScript Tracking

Successful seed files are recorded in `SeedScriptItem`.

The key is:

```text
scriptName + entityHandle + isSuccess
```

If a script already ran successfully, the seeder skips it.

Implication:

- Do not expect edits to an already executed seed file to apply on an existing database.
- Add a new numbered seed file for new production reference data.
- For local/test databases, rerunning from scratch applies all files.

## Translation Seeder

File:

```text
backend/src/database/seeder/TranslationSeeder.ts
```

Translation seed files use this shape:

```json
{
  "entity": "ticket",
  "property": "title",
  "de": "Titel",
  "en": "Title"
}
```

Translations are unique by:

```text
entity + property + language
```

The translation seeder upserts:

- existing rows are updated by `entity + property + language`
- missing rows are created
- duplicate rows within one file are ignored after the first occurrence per language

This means a later `translationData_XXX.json` can intentionally override text from an earlier file.

## Permission Seeder

Files:

```text
backend/src/database/seeder/PermissionSeeder.ts
backend/src/database/seeder/permission-matrices.ts
backend/src/database/seeder/role-handles.ts
```

The permission seeder creates missing `PermissionItem` rows for every role/entity combination. It does not rewrite existing permissions.

When adding a new entity:

1. Ensure the entity is seeded in `entityData_XXX.json`.
2. Decide if known roles should read/show/insert/update/delete it.
3. Update `permission-matrices.ts` if defaults are not enough.

## Role Starter Seeder

Role starters connect roles to default dashboards and favorites.

Use it for onboarding defaults, not for permission grants.

Relevant files:

```text
backend/src/database/seeder/RoleStarterSeeder.ts
backend/src/database/seeder/json-*/roleStarterDashboard/
backend/src/database/seeder/json-*/roleStarterFavorite/
```

## Migrations

Migrations live in:

```text
backend/src/database/migration/
```

Use a migration for schema changes:

- new table
- new column
- column type change
- nullable/default changes
- relation/foreign key changes
- index changes

Do not rely on seeders to patch schema.

Create migrations through the ORM command when possible:

```bash
npm run orm:create-migration --prefix backend
```

Manual migrations are acceptable when carefully scoped and reviewed.

## Adding A New Entity: Data Checklist

For a normal user-facing entity, consider these seed files:

```text
entity/entityData_XXX.json
entityRoute/entityRouteData_XXX.json
translation/translationData_XXX.json
```

Optional:

```text
entityGroup/entityGroupData_XXX.json
statusEntity/statusEntityData_XXX.json
typeEntity/typeEntityData_XXX.json
inboxTemplate/inboxTemplateData_XXX.json
inboxSubscription/inboxSubscriptionData_XXX.json
favoriteTemplate/favoriteTemplateData_XXX.json
dashboardTemplate/dashboardTemplateData_XXX.json
```

For demonstration:

```text
newEntity/newEntityData_001.json
```

Use realistic demo data when it affects AI, vectorization, search, inbox, dashboards, or user training.

## Numbering Rules

- Use three digits: `_001`, `_002`, `_016`.
- Pick the next available number in the folder.
- Keep production and demonstration numbering aligned when they contain corresponding changes.
- Do not reuse a number for a different purpose.

## Verification

Validate JSON:

```bash
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('<file>','utf8'));"
```

Run backend typecheck:

```bash
npm run type-check:backend
```

For schema changes, run migrations and seeders on a disposable/local database when possible:

```bash
npm run orm:migrate --prefix backend
npm run orm:seed --prefix backend
```

## Common Mistakes

- Editing `translationData_001.json` instead of adding `translationData_XXX.json`.
- Adding a new entity seed before its referenced type/status rows exist.
- Adding production seed data but not demonstration data.
- Adding a migration but forgetting the entity registry or permissions.
- Expecting a successful old seed file to rerun automatically.
