# Generic Timeline, Change Log, And Record History

Sapling has two complementary record-history mechanisms:

- **Change log** is persisted audit history for direct generic CRUD mutations on one record.
- **Timeline** is a dynamic, record-centric activity view built from related records and their date fields.

They answer different questions. Use change log for "who changed this field?", and use timeline for "what happened around this customer, ticket, opportunity, or person over time?"

## Core Files

Backend:

```text
backend/src/api/generic/generic.controller.ts
backend/src/api/generic/generic.service.ts
backend/src/api/generic/generic-timeline.service.ts
backend/src/api/generic/dto/change-log-response.dto.ts
backend/src/api/generic/dto/timeline-response.dto.ts
backend/src/entity/ChangeLogItem.ts
backend/src/entity/ChangeLogDetailItem.ts
backend/src/entity/ChangeLogActionItem.ts
```

Frontend:

```text
frontend/src/components/changeLog/SaplingRecordChangeLog.vue
frontend/src/components/timeline/SaplingRecordTimeline.vue
frontend/src/components/timeline/SaplingRecordTimelineMonthCard.vue
frontend/src/composables/changeLog/useSaplingRecordChangeLog.ts
frontend/src/composables/timeline/useSaplingRecordTimeline.ts
frontend/src/composables/context/useSaplingContextMenuTable.ts
frontend/src/stores/changeLogDialogStore.ts
frontend/src/stores/timelineDialogStore.ts
```

Seed/reference data:

```text
backend/src/database/seeder/json-production/entity/entityData_002.json
backend/src/database/seeder/json-production/entity/entityData_003.json
backend/src/database/seeder/json-production/entityRoute/entityRouteData_002.json
backend/src/database/seeder/json-production/entityRoute/entityRouteData_003.json
backend/src/database/seeder/json-production/translation/translationData_009.json
backend/src/database/seeder/json-production/translation/translationData_010.json
```

## API Contract

```http
GET /api/generic/:entityHandle/:handle/change-log
GET /api/generic/:entityHandle/:handle/timeline?before=YYYY-MM&months=6
```

Both endpoints use `SessionOrBearerAuthGuard` and `GenericPermissionGuard` with `allowRead` on the requested anchor entity.

`change-log` returns persisted entries ordered newest first.

`timeline` returns:

- the anchor record with its display label and date span
- monthly buckets
- entity summaries for related records
- drilldown filters that can open matching table views
- `hasMore` and `nextBefore` for loading older months

## Change Log Lifecycle

Generic `create`, `update`, and `delete` schedule a background change-log write after the main mutation has completed.

The stored log contains:

- `action`: `create`, `update`, or `delete`
- `entity`: the generic entity handle
- `reference`: the record handle as string
- `person`: the user who triggered the mutation
- `oldPayload` and `newPayload`
- child `ChangeLogDetailItem` records for changed fields

The write is intentionally tolerant. `safeStoreChangeLog` catches errors and logs them through `global.log` so a failed audit write does not break the business mutation.

## Payload Rules

Change-log payloads are projected from the entity template.

- Security fields are handled specially and should not be exposed casually.
- Reference fields are reduced to their referenced primary key values.
- Dates are normalized to ISO strings.
- `updatedAt` is ignored for detail rows to avoid noisy entries.
- Details are generated only when normalized old and new values differ.

This means the change log is an operational audit aid, not a full database snapshot or legal archive.

## Timeline Discovery

The timeline is generic and schema-driven. For a requested anchor entity, `GenericTimelineService` scans `ENTITY_REGISTRY` and finds readable entities that have visible `m:1` relations pointing back to the anchor entity.

A relation field is eligible when:

- it is `kind === 'm:1'`
- its `referenceName` matches the anchor entity
- it is not marked `isSecurity`
- it is not marked `isSystem`
- it is not marked `isHideAsReference`
- the current user has `allowRead` for the related entity

For `person` and `company` anchors, relation fields marked `isPerson` or `isCompany` are split into clearer groups. This keeps records with multiple person/company references understandable, for example assignee, customer contact, and responsible person.

## Timeline Dates

Each related entity gets a date configuration from its template:

1. Prefer a field marked `isDateStart`.
2. Otherwise use `createdAt`.
3. Prefer a field marked `isDateEnd`.
4. Otherwise use `updatedAt`.

If a date field is missing on a record, the service falls back between primary and fallback fields. Records are included in a month when their start/end span overlaps the month window.

## Timeline Summaries

Monthly summaries include:

- total related record count
- start and end counts for the month
- relation fields that connect the related entity to the anchor
- chip groups from fields marked `isChip`
- boolean groups when no chip fields are available
- amount totals when the related entity has a visible `isMoney` field
- drilldown filters for opening matching record lists

The frontend uses these summaries for compact activity cards rather than loading every related record into the dialog.

## Frontend Entry Points

The table context menu exposes both dialogs when a row has a `handle`:

- `global.timeline` opens `SaplingRecordTimeline`
- `global.changeLog` opens `SaplingRecordChangeLog`

Generic reference fields also expose a timeline button for the referenced record. This makes it possible to jump from one record to the activity around a referenced customer, person, ticket, or opportunity without leaving the current workflow.

## MCP Usage

The internal Sapling MCP server exposes `generic_timeline`. It wraps `GenericService.getRecordTimeline` and enforces the same read permissions.

There is currently no dedicated MCP tool for `change-log`. Agents that need persisted audit data should use the generic API directly when available, or query the `changeLog` entity through generic tools if their permissions allow it.

## Adding A New Entity To Timeline

1. Add the entity to `ENTITY_REGISTRY`.
2. Add at least one visible `m:1` relation to a likely anchor entity.
3. Avoid `isHideAsReference` if the relation should appear in timeline discovery.
4. Mark start/end date fields with `isDateStart` and `isDateEnd` when `createdAt`/`updatedAt` are not the right timeline semantics.
5. Mark meaningful status/type references as `isChip` for grouping.
6. Mark one amount field as `isMoney` if monthly totals are useful.
7. Add translations for timeline-visible field labels.
8. Verify the timeline from a related anchor record and from the generic reference field.

## Adding A Field To Change Log

For normal generic entity fields, no explicit wiring is needed. The field participates when it is part of the template and appears in create/update/delete payload projections.

Check these points for special fields:

- Security-sensitive fields should be marked `isSecurity`.
- Derived/read-only UI fields should not be sent as mutation payload.
- Reference fields should have stable referenced primary keys.
- Large markdown fields are supported but may make detail views noisy.

## Verification Checklist

- Create a record through `POST /api/generic/:entityHandle` and confirm a `create` log appears.
- Update one visible field and confirm exactly that field appears in details.
- Update only `updatedAt`-equivalent metadata and confirm it does not create noisy detail rows.
- Delete a record and confirm the delete log keeps enough old payload for diagnosis.
- Open timeline for a company/person/customer record with related tickets, events, opportunities, and effort estimates.
- Confirm `before` pagination loads older months and stops when `hasMore` is false.
- Confirm users without read permission on a related entity do not see it in timeline summaries.

