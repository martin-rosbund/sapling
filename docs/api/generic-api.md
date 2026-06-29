# Generic API Contract

Sapling's generic API exposes registered entities through a consistent CRUD contract. It is the backend foundation for dynamic tables, dialogs, timelines, change logs, and many MCP generic tools.

## Main Files

```text
backend/src/api/generic/generic.controller.ts
backend/src/api/generic/generic.service.ts
backend/src/api/generic/generic-read.service.ts
backend/src/api/generic/generic-mutation.service.ts
backend/src/api/generic/generic-query.service.ts
backend/src/api/generic/generic-filter.service.ts
backend/src/api/generic/generic-payload.service.ts
backend/src/api/generic/generic-permission.service.ts
backend/src/api/generic/generic-sanitizer.service.ts
backend/src/api/generic/generic-timeline.service.ts
backend/src/entity/global/entity.registry.ts
```

## Base URL

```text
/api/generic
```

All generic routes use `SessionOrBearerAuthGuard`. Most routes also use `GenericPermissionGuard`.

## Entity Handles

Every generic route takes an `entityHandle`.

Example:

```text
ticket
salesOpportunity
event
effortEstimate
company
person
```

The handle must exist in `ENTITY_REGISTRY`.

## List Records

```text
GET /api/generic/:entityHandle
```

Common query parameters:

| Parameter | Meaning |
| --- | --- |
| `filter` | JSON object encoded as string |
| `orderBy` | JSON object encoded as string |
| `relations` | JSON list encoded as string |
| `page` | 1-based page number |
| `limit` | page size |

Example:

```text
GET /api/generic/ticket?filter={"status":{"handle":{"$in":["new","open"]}}}&orderBy={"updatedAt":"DESC"}&relations=["status","priority"]
```

URL-encode JSON in real clients.

## Filters

Filters follow MikroORM-style query objects.

Common operators:

```text
$eq
$ne
$in
$nin
$ilike
$like
$gt
$gte
$lt
$lte
$and
$or
```

Nested relation filters are supported when relation names match entity metadata.

Example:

```json
{
  "$and": [
    { "isActive": true },
    { "assigneePerson": { "email": { "$ilike": "%example.com" } } }
  ]
}
```

Clients should inspect `entity_schema` through MCP or template metadata before composing filters for unfamiliar entities.

## Relations

Use `relations` to request populated references.

Example:

```json
["status", "priority", "creatorCompany", "creatorPerson"]
```

Avoid broad relation loading in high-volume lists. Request only what the UI or integration needs.

## Create

```text
POST /api/generic/:entityHandle
```

Payload is the generic record data.

Rules:

- Do not send autoincrement primary keys.
- Required fields come from template metadata.
- Relation fields can usually be sent as handles or relation-like values accepted by the payload service.
- Custom fields can be sent in a nested `customFields` object, for example
  `{ "customFields": { "externalCompanyName": "Acme GmbH" } }`.
- Security/system/read-only fields may be ignored or rejected depending on metadata.

## Update

```text
PATCH /api/generic/:entityHandle/:handle
```

Payload contains changed fields.

The generic mutation service handles:

- scalar fields
- many-to-one references
- nullable relations
- custom fields in `customFields`
- special payload normalization
- change log creation

## Custom Fields

Sapling supports generic custom fields through `customFieldDefinition`,
`customFieldType`, and `customFieldValue` records. Active definitions are
appended to entity template metadata as fields named `customFields.<fieldKey>`,
and read responses include both a nested `customFields` object and flattened
preview values for generated tables.

Supported first-pass custom field types are seeded as reference records in
`customFieldType`:

```text
text
longText
number
boolean
date
dateTime
select
multiSelect
```

Filters can target custom fields with dotted paths, for example:

```json
{ "customFields.externalCompanyName": { "$ilike": "%Acme%" } }
```

Backend sorting on custom fields is intentionally ignored for now; tables can
still display hydrated values.

## Delete

```text
DELETE /api/generic/:entityHandle/:handle
```

Deletion requires `allowDelete` permission for the entity.

## Change Log

```text
GET /api/generic/:entityHandle/:handle/change-log
```

Returns persisted create, update, and delete log entries for one record.

Important files:

```text
backend/src/entity/ChangeLogItem.ts
backend/src/entity/ChangeLogDetailItem.ts
backend/src/api/generic/dto/change-log-response.dto.ts
```

## Timeline

```text
GET /api/generic/:entityHandle/:handle/timeline
```

Query parameters:

| Parameter | Meaning |
| --- | --- |
| `before` | month cursor in `YYYY-MM` format |
| `months` | number of non-empty months to load |

The timeline aggregates activity around a record and directly related entities.

## Downloads

The generic controller also supports downloads/exports where enabled by implementation and configuration. Respect `GENERIC_DOWNLOAD_LIMIT` from backend environment config.

## Permissions

Generic routes check:

- authentication through `SessionOrBearerAuthGuard`
- entity/action permission through `GenericPermissionGuard`
- entity-specific server filters such as private Event visibility

HTTP method to permission mapping:

| Method | Permission |
| --- | --- |
| `GET` | `allowRead` |
| `POST` | `allowInsert` |
| `PATCH` | `allowUpdate` |
| `DELETE` | `allowDelete` |

Some public read entities are allowed without an authenticated user:

```text
translation
entity
entityGroup
```

`event` has an additional row-level privacy rule. Records with `isPrivate = true` are readable only by their `creatorPerson`, even for roles that otherwise have global Event read permission. This rule is applied server-side to generic lists, single-record lookups through read paths, downloads, relation/reference validation, KPIs that use generic permission filters, MCP generic reads, and Event update/delete handle resolution.

## Sanitization

The generic API sanitizes records before returning them. Sensitive fields marked with Sapling security metadata should not be exposed to generic clients or MCP schemas.

Relevant file:

```text
backend/src/api/generic/generic-sanitizer.service.ts
```

## Frontend Consumers

Key frontend files:

```text
frontend/src/services/api.generic.service.ts
frontend/src/stores/genericStore.ts
frontend/src/composables/table/useSaplingTable.ts
frontend/src/components/dialog/
```

The frontend should prefer generic API calls for registered entities unless a feature needs a specialized workflow endpoint.

## MCP Relationship

Sapling MCP tools such as `generic_list`, `generic_get`, `generic_create`, `generic_update`, and `generic_delete` call the same generic services and apply the same permission model.

For external MCP integration details, see:

```text
docs/integrations/sapling-mcp-http.md
```
