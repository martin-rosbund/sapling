# Import Batches And External Record Links

Sapling has two import paths:

- the lightweight table CSV import under the generic table toolbar
- the initial-import workflow under `/import`

The initial-import workflow is designed for files that do not already match
Sapling handles or field names. It imports CSV data through auditable batches
and can link Sapling records back to stable keys from external systems.

## Main Files

```text
backend/src/api/import/
backend/src/entity/ImportSourceItem.ts
backend/src/entity/ImportTemplateItem.ts
backend/src/entity/ImportBatchItem.ts
backend/src/entity/ImportBatchRowItem.ts
backend/src/entity/ExternalRecordLinkItem.ts
frontend/src/components/import/SaplingImportWorkspace.vue
frontend/src/services/api.import.service.ts
frontend/src/views/ImportView.vue
```

## Core Model

`ImportSourceItem` represents a source system such as Sage 100.

`ImportTemplateItem` stores reusable import strategies for one source system
and one target entity:

- field mappings
- external key columns
- relation mapping metadata
- optional generic reference mapping

The import workspace filters templates by selected source system and target
entity, so users only see templates that fit the current import context.

`ImportBatchItem` stores one uploaded CSV analysis and the selected mapping:

- target entity
- source system
- original headers and sample rows
- field mappings
- external key columns
- generic reference mapping
- selected import template
- validation and execution counters

`ImportBatchRowItem` stores row-level raw data, normalized payload, status,
action, target reference, external key details, and error messages.

`ExternalRecordLinkItem` is the stable bridge from an external system to any
Sapling record. It intentionally follows the same generic reference shape used
by `DocumentItem` and `InformationItem`:

```text
source + entity + externalKeyHash -> entity + reference
```

This keeps external IDs out of business entities and makes the mechanism work
for companies, people, tickets, documents, information records, and future
generic target types.

## Workflow

1. Upload a CSV file.
2. The backend parses headers, delimiter, rows, and sample rows.
3. Choose target entity and optional source system.
4. Load an existing import template or map CSV columns to Sapling fields.
5. Optionally choose one or more external key columns.
6. Save the current mapping as an import template for later batches.
7. Optionally configure a generic target reference for entities such as
   `information` that use `entity + reference`.
8. Validate the batch.
9. Execute the batch.

During execution, rows with an existing external record link update the linked
Sapling record. Rows without a link create a new record and store the link.

## Extension Points

The current workflow is CSV-first and deliberately conservative. Future
extensions should add to the batch configuration shape instead of replacing it:

- XLSX parsing
- fuzzy reference matching
- multi-file imports
- relation mappings by external keys
- staged imports with explicit publish/rollback behavior
- richer document binary ingestion

Keep the canonical record bridge in `ExternalRecordLinkItem` so repeated imports
remain generic and auditable.
