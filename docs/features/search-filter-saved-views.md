# Search, Filters, And Saved Views

Sapling tables combine generic API filters, frontend column filters, free-text search, entity routes, and favorites. The backend remains the authority for permission-scoped reads; the frontend serializes user intent into query parameters and persisted favorite records.

## Main Files

```text
backend/src/api/generic/generic.controller.ts
backend/src/api/generic/generic-filter.service.ts
backend/src/api/generic/generic-read.service.ts
backend/src/api/generic/generic-permission.service.ts
backend/src/entity/FavoriteItem.ts
backend/src/entity/FavoriteTemplateItem.ts
backend/src/entity/EntityRouteItem.ts
frontend/src/components/table/filter/
frontend/src/composables/table/useSaplingTableFilters.ts
frontend/src/composables/table/useSaplingTableColumnFilter.ts
frontend/src/composables/table/useSaplingTableFilterHelpers.ts
frontend/src/utils/saplingTableUtil.ts
frontend/src/utils/saplingDynamicFilter.ts
frontend/src/utils/saplingFavoriteNavigation.ts
frontend/src/components/table/SaplingTableFavoriteDialog.vue
frontend/src/composables/dialog/useSaplingDialogFavorite.ts
frontend/src/composables/dashboard/useSaplingFavorites.ts
frontend/src/components/dashboard/SaplingFavorites.vue
```

Seed files:

```text
backend/src/database/seeder/json-production/favoriteTemplate/
backend/src/database/seeder/json-production/roleStarterFavorite/
backend/src/database/seeder/json-production/entityRoute/
backend/src/database/seeder/json-demonstration/favoriteTemplate/
backend/src/database/seeder/json-demonstration/roleStarterFavorite/
backend/src/database/seeder/json-demonstration/entityRoute/
```

## Generic Filter Contract

Generic read endpoints accept a JSON filter. The format follows MikroORM-style where clauses.

Common operators:

```text
$eq
$ne
$in
$nin
$gt
$gte
$lt
$lte
$ilike
$like
$and
$or
```

`GenericFilterService` normalizes `$like` to `$ilike`. `$ilike` is only allowed on string-like fields from the entity template.

Logical operators must be non-empty arrays:

```json
{
  "$and": [
    { "status": { "handle": { "$nin": ["closed"] } } },
    { "deadlineDate": { "$lt": "{{tomorrow.start}}" } }
  ]
}
```

Date strings on date/datetime fields are converted to `Date` instances before querying.

## Dynamic Filter Placeholders

Backend-supported placeholders:

| Placeholder | Meaning |
| --- | --- |
| `{{currentUser.handle}}` | Current user person handle |
| `{{currentUser.company.handle}}` | Current user's company handle |
| `{{today.start}}` | Start of today |
| `{{tomorrow.start}}` | Start of tomorrow |
| `{{dayAfterTomorrow.start}}` | Start of the day after tomorrow |
| `{{week.start}}` | Start of current week |
| `{{week.end}}` | Start of next week |
| `{{month.start}}` | Start of current month |
| `{{month.end}}` | Start of next month |
| `{{now}}` | Current timestamp |

Frontend utilities also understand older UI token names such as `{{currentPerson.handle}}` and `{{currentCompany.handle}}`. When persisting filters for backend execution, prefer the backend token names.

## Frontend Table Filtering

The frontend builds filters from:

- URL query `filter`
- URL query `search`
- URL query `sortBy`
- column filter menu state
- table-specific default filters
- drilldown filters from KPI/timeline views

`saplingTableUtil.ts` turns user-visible filter choices into backend where clauses. Column filter components choose the input shape by field type: single value, relation selection, ranges, boolean values, and icon values.

Free-text search builds an `$or` across searchable/value fields from the entity template.

## Saved Views

`FavoriteItem` stores a personal saved view.

| Field | Meaning |
| --- | --- |
| `title` | Visible name |
| `search` | Persisted free-text search |
| `sortBy` | Persisted table sort configuration |
| `filter` | Persisted generic filter JSON |
| `person` | Owner |
| `entity` | Target entity |
| `entityRoute` | Optional route used when opening the favorite |

`FavoriteTemplateItem` stores reusable favorite definitions.

| Field | Meaning |
| --- | --- |
| `name` | Template name |
| `entity` | Target entity |
| `entityRoute` | Optional route |
| `filter` | Reusable filter JSON |
| `isRecommended` | Highlights the template in dashboard recommendations |

`RoleStarterSeeder` can assign favorite templates to roles through `roleStarterFavorite` seed files.

## Favorite Navigation

`buildFavoritePath()` resolves favorites to an application route:

1. Use `favorite.entityRoute.route` when present.
2. Resolve numeric `entityRoute` through the loaded entity route list when needed.
3. Fall back to `table/<entityHandle>`.
4. Append `search`, `sortBy`, and `filter` as encoded query parameters.

This means favorite filters should be route-safe and JSON-serializable. Avoid functions, dates as `Date` objects, or values that require client-only state.

## Entity Routes

`EntityRouteItem` lets one entity open through different views. Favorites can point to the default table route or a more specific route such as partner/file views.

When adding routes:

1. Add an `entityRouteData_XXX.json` seed file.
2. Link it to the entity.
3. Use the same route path that the frontend router expects.
4. Update favorite templates when the new route should be the preferred target.

## Extension Checklist

When adding a saved view:

1. Test the filter in the generic table URL first.
2. Persist the filter as object JSON, not escaped string JSON, unless an existing seeder requires string compatibility.
3. Use dynamic placeholders for user-relative filters.
4. Add the favorite template in a new numbered seed file.
5. Add role starter data if the view should be preloaded for roles.
6. Verify navigation from `SaplingFavorites.vue` and dashboard recommendations.

When adding a new filter UI behavior:

1. Add the UI state in `useSaplingTableColumnFilter.ts`.
2. Convert it to backend filter JSON in `saplingTableUtil.ts`.
3. Add helper parsing in `useSaplingTableFilterHelpers.ts` if existing filters should hydrate back into UI state.
4. Update frontend tests for serialization and hydration.
5. Confirm the backend accepts the produced operators through `GenericFilterService`.

## Verification

Useful targeted commands:

```powershell
npm test --prefix backend -- generic-filter.service.spec.ts generic-read.service.spec.ts --runInBand
npm run type-check:backend
npm run type-check:frontend
.\node_modules\.bin\vitest.cmd run src\composables\table\__tests__\useSaplingTableFilterHelpers.test.ts
.\node_modules\.bin\vitest.cmd run src\composables\table\__tests__\useSaplingTableColumnFilter.test.ts
.\node_modules\.bin\vitest.cmd run src\utils\__tests__\saplingDynamicFilter.test.ts
.\node_modules\.bin\vitest.cmd run src\utils\__tests__\saplingFavoriteNavigation.test.ts
```

Run a browser check for saved views because route/query behavior is easiest to break at the integration level.
