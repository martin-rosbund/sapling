# KPI And Dashboard System

Sapling KPIs are persisted definitions that aggregate any registered entity through the generic metadata model. Dashboards and favorites arrange those definitions into user-facing work surfaces.

## Main Files

```text
backend/src/entity/KpiItem.ts
backend/src/entity/KpiTypeItem.ts
backend/src/entity/KpiAggregationItem.ts
backend/src/entity/KpiTimeframeItem.ts
backend/src/entity/DashboardItem.ts
backend/src/entity/DashboardTemplateItem.ts
backend/src/entity/FavoriteItem.ts
backend/src/entity/FavoriteTemplateItem.ts
backend/src/api/kpi/kpi.controller.ts
backend/src/api/kpi/kpi.service.ts
backend/src/api/kpi/kpi.executor.ts
backend/src/api/kpi/dto/
frontend/src/components/kpi/
frontend/src/components/dashboard/
frontend/src/composables/kpi/
backend/src/database/seeder/json-production/kpi/
backend/src/database/seeder/json-production/dashboardTemplate/
backend/src/database/seeder/json-production/favoriteTemplate/
backend/src/database/seeder/json-demonstration/kpi/
```

## KPI Model

`KpiItem` describes what should be measured, how it should be aggregated, and which entity it targets.

Important fields:

| Field | Meaning |
| --- | --- |
| `name` | Human-readable KPI name |
| `description` | Optional explanatory text |
| `targetEntity` | `EntityItem` that resolves through `ENTITY_MAP` |
| `aggregation` | Aggregation handle such as `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` |
| `field` | Field path to aggregate; relation paths such as `type.handle` are supported |
| `type` | Rendering/execution shape such as `ITEM`, `LIST`, `BREAKDOWN`, `TREND`, `COMPARISON`, `SPARKLINE` |
| `timeframeField` | Date field for time-based KPIs; defaults to `created_at` in executor logic |
| `timeframe` | Current period such as `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR` |
| `timeframeInterval` | Sparkline bucket interval, for example `MONTH` within `YEAR` |
| `filter` | Persisted generic filter JSON |
| `groupBy` | Optional list of field paths used for grouped output |
| `relation` | Optional relation entity context |
| `relationField` | Field used for relation drilldowns/grouping |

Reference handles are seeded in:

```text
backend/src/database/seeder/json-production/kpiType/kpiTypeData_001.json
backend/src/database/seeder/json-production/kpiAggregation/kpiAggregationData_001.json
backend/src/database/seeder/json-production/kpiTimeframe/kpiTimeframeData_001.json
```

The demonstration seed files can add richer examples, but the reference handles should stay stable because KPI execution switches on them.

## Execution Flow

KPI execution starts in `KpiService.executeKPIById(id, currentUser)`.

1. The KPI is loaded with `aggregation`, `type`, `timeframe`, `timeframeInterval`, `targetEntity`, and `relation`.
2. `targetEntity.handle` is resolved against `ENTITY_MAP`.
3. The persisted filter is prepared through `GenericFilterService.prepareReadCriteria()`.
4. Runtime placeholders such as `{{currentUser.handle}}`, `{{currentUser.company.handle}}`, and date placeholders are resolved.
5. `GenericPermissionService.setTopLevelFilter()` applies the current user's entity scope.
6. `KPIExecutor` builds SQL through MikroORM query builders.
7. The service returns a KPI response with value data and drilldown metadata.

This means KPI results are not a bypass around normal entity permissions. If a user cannot read the underlying records, the permission filter must also limit the KPI result.

## KPI Types

| Type | Runtime method | Typical frontend component |
| --- | --- | --- |
| `ITEM` | `executeItemOrList()` | `SaplingKpiItem.vue` |
| `LIST` | `executeItemOrList()` | `SaplingKpiList.vue` |
| `BREAKDOWN` | `executeItemOrList()` with grouping | `SaplingKpiBreakdown.vue` |
| `TREND` | `executeTrend()` | `SaplingKpiTrend.vue` |
| `COMPARISON` | `executeTrend()` | `SaplingKpiComparison.vue` |
| `SPARKLINE` | `executeSparkline()` | `SaplingKpiSparkline.vue` |

`TREND` and `COMPARISON` compare the current timeframe with the previous equivalent timeframe. `SPARKLINE` creates bucketed values inside a timeframe, for example months within a year or days within a month.

## Aggregation And Grouping

`KPIExecutor` resolves field paths before building SQL. This allows KPIs to aggregate on direct columns and relation fields.

Examples:

```json
{
  "aggregation": "COUNT",
  "field": "handle",
  "targetEntity": "ticket",
  "type": "ITEM"
}
```

```json
{
  "aggregation": "COUNT",
  "field": "type.handle",
  "targetEntity": "salesOpportunity",
  "type": "BREAKDOWN",
  "groupBy": ["type.handle"]
}
```

Use relation paths intentionally. Every additional relation affects query shape and must still match the entity metadata and database naming.

## Drilldowns

KPI responses include drilldown context so cards can open the underlying generic entity view with the same semantic filter.

The service builds different drilldown variants:

| KPI shape | Drilldown behavior |
| --- | --- |
| Item/list/breakdown | Base entity filter |
| Trend/comparison | Current and previous period filters |
| Sparkline | Bucket-level filters |

Drilldowns should always carry enough context to reproduce the KPI subset in the generic table without leaking records outside the user's permission scope.

## Dashboard And Favorites

`DashboardItem` stores a person-owned dashboard with a many-to-many list of KPIs.

`DashboardTemplateItem` stores reusable dashboard layouts. It is usually seeded so roles or users can start with sensible KPI collections.

`FavoriteItem` stores person-owned saved generic views:

| Field | Meaning |
| --- | --- |
| `title` | Visible favorite name |
| `search` | Optional persisted free-text search |
| `sortBy` | Optional persisted sorting |
| `filter` | Generic filter JSON |
| `person` | Owner |
| `entity` | Target entity |
| `entityRoute` | Optional route configuration |

`FavoriteTemplateItem` stores reusable favorite definitions. Starter data can assign dashboard/favorite templates to roles so new users get a useful workspace without manual setup.

Frontend dashboard components:

| Component | Responsibility |
| --- | --- |
| `SaplingDashboard.vue` | Main dashboard surface |
| `SaplingDashboardTabs.vue` | Dashboard tab switching |
| `SaplingKpis.vue` | KPI collection renderer |
| `SaplingFavorites.vue` | Favorite list renderer |
| `SaplingDashboardTemplateLoadDialog.vue` | Load dashboard templates |
| `SaplingFavoriteTemplateLoadDialog.vue` | Load favorite templates |
| `SaplingDashboardRecommendedFavorites.vue` | Suggested favorites |

## Extension Checklist

When adding a new KPI:

1. Confirm the target entity exists in `ENTITY_REGISTRY` and `ENTITY_MAP`.
2. Pick the narrowest aggregation/type combination that answers the business question.
3. Use `filter` placeholders instead of hard-coded user handles when the KPI should be user-relative.
4. Set `timeframeField`, `timeframe`, and `timeframeInterval` only for time-aware KPIs.
5. Add seed data in a new numbered file when the KPI should ship with production or demo data.
6. Add dashboard template or role starter data when the KPI should be visible by default.
7. Verify drilldown behavior in the generic table.

When adding a new KPI type:

1. Add or seed the `KpiTypeItem` handle.
2. Extend `KpiService` dispatch.
3. Extend `KPIExecutor` if the data shape is new.
4. Add DTOs when the response shape changes.
5. Add frontend component/composable rendering.
6. Add translations and seed permissions as needed.
7. Add backend tests for execution and frontend tests for rendering behavior.

## Verification

There are currently no dedicated KPI test files in the repository. Use targeted typechecks and add tests when changing executor behavior.

Useful commands:

```powershell
npm run type-check:backend
npm run type-check:frontend
```

For executor changes, prefer adding backend tests around `KpiService`/`KPIExecutor` with seeded entities and filters. For dashboard UI changes, add focused frontend tests around the affected KPI component or dashboard component.
