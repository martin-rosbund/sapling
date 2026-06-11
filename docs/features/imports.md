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
backend/src/entity/ImportTemplateValueMappingItem.ts
backend/src/entity/ImportBatchItem.ts
backend/src/entity/ImportBatchRowItem.ts
backend/src/entity/ExternalRecordLinkItem.ts
frontend/src/components/import/SaplingImportWorkspace.vue
frontend/src/services/api.import.service.ts
frontend/src/views/ImportView.vue
backend/src/api/ai/sapling-mcp.service.ts
frontend/src/components/system/ai-chat/SaplingAiChatConversation.vue
```

## Core Model

`ImportSourceItem` represents a source system such as Sage 100.

`ImportTemplateItem` stores reusable import strategies for one source system
and one target entity:

- field mappings
- value mappings
- external key columns
- relation mapping metadata
- optional generic reference mapping

The import workspace filters templates by selected source system and target
entity, so users only see templates that fit the current import context.

`ImportTemplateValueMappingItem` stores user-maintainable value conversions for
an import template. Each row maps one source value for one target field to the
value Sapling should receive. This keeps template maintenance available through
the generic table UI instead of forcing users to edit a JSON blob.

`ImportBatchItem` stores one uploaded CSV analysis and the selected mapping:

- target entity
- source system
- original headers and sample rows
- field mappings
- value mappings
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
5. Optionally configure value mappings for mapped fields, for example `1`
   from the file becomes status `5` or a referenced Sapling record handle.
6. Optionally ask the AI to suggest a configuration. The backend sends only
   CSV headers, a few sample rows, target entity metadata, reference
   candidates, and matching templates to the configured chat model. The
   returned suggestion is normalized server-side and then applied in the UI as
   an editable proposal.
7. Optionally choose one or more external key columns.
8. Save the current mapping as an import template for later batches.
9. Optionally configure a generic target reference for entities such as
   `information` that use `entity + reference`.
10. Validate the batch.
11. Execute the batch.

Value mappings are stored as `ImportTemplateValueMappingItem` rows for reusable
templates and are also copied into the batch `mapping` JSON when a batch is
validated. They are applied while the batch is validated, before the row payload
is normalized for the target entity. The validated payload is then used for
execution, so users can inspect the Sapling preview before anything is written.

During execution, rows with an existing external record link update the linked
Sapling record. Rows without a link create a new record and store the link.

## AI Chat Import Agent

The AI Chat can expose an Import-Agent for CSV, TSV, and TXT files. The chat
upload endpoint stores the original file as a `DocumentItem`, analyzes it
through the same import parser, creates an `ImportBatchItem`, and links the
result to the chat with `AiChatAttachmentItem`.

The chat does not introduce a second import engine. It uses the existing batch,
template, validation, and execution services:

- uploaded files become auditable import batches
- the agent receives only a compact file summary in chat context
- `import_get_batch` can inspect the batch when more detail is needed
- `import_list_templates` and `import_suggest_mapping` prepare strategies
- `import_match_existing_records` checks sampled values against readable data
- `import_configure_batch` and `import_execute_batch` remain confirm-gated

The V1 upload surface is deliberately CSV-first. XLSX, multi-file imports, and
richer binary ingestion remain extension points.

## AI Suggestions

`POST /api/import/batches/:handle/suggest` builds a constrained prompt for the
configured/default chat provider. The request can pass the currently selected
target entity and source system because a freshly analyzed batch is not yet
validated and may not have those relations persisted.

The endpoint returns structured proposals for:

- CSV column to Sapling field mappings
- one or more recommended external key columns
- detected reference fields
- conservative value mapping candidates
- confidence and short reasoning per proposal

The UI applies the proposal to the same editable mapping state used for manual
configuration. Users can correct fields, open the value mapping dialog, save
the result as an import template, and then validate the batch through the
normal import path.

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
