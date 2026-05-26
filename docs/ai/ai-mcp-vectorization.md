# AI, MCP, And Vectorization

Sapling's AI system centers on Songbird, the internal assistant. Songbird can use Sapling data through MCP tools, generic services, and semantic vector search.

## Main Files

```text
backend/src/api/ai/ai.service.ts
backend/src/api/ai/ai-chat-runtime.service.ts
backend/src/api/ai/ai.controller.ts
backend/src/api/ai/mcp.service.ts
backend/src/api/ai/sapling-mcp.service.ts
backend/src/api/ai/sapling-mcp-tool-definitions.ts
backend/src/api/ai/sapling-mcp-permission.service.ts
backend/src/api/ai/ai-vector.service.ts
backend/src/api/ai/ai-vector.utils.ts
backend/src/api/ai/prompts/
frontend/src/components/system/ai-chat/
frontend/src/components/system/SaplingVectorizationDialog.vue
```

## Chat Model

Relevant entities:

```text
AiChatSessionItem
AiChatMessageItem
AiChatTranscriptionItem
AiProviderTypeItem
AiProviderModelItem
AiVectorDocumentItem
McpServerConfigItem
```

Provider/model records are stored in the database. Runtime credentials and provider behavior are resolved by backend AI provider services.

## Songbird System Prompt

Songbird's base behavior and tool guidance live in:

```text
backend/src/api/ai/prompts/ai.prompts.ts
```

Important expectations:

- speak as the Sapling assistant
- use current Sapling tools when needed
- prefer generic tools for current data
- use semantic search for natural-language long-text questions
- do not invent record URLs
- treat internal handles as technical metadata unless explicitly requested

## MCP Layers

Sapling has two MCP-related layers.

### Internal Sapling MCP Server

File:

```text
backend/src/api/ai/sapling-mcp.service.ts
```

This exposes Sapling-native tools:

```text
current_person
entity_catalog
entity_schema
entity_search
generic_list
generic_get
generic_timeline
ticket_search
semantic_search
generic_create
generic_update
generic_delete
```

It is also exposed over HTTP:

```text
/api/ai/mcp
```

See:

```text
docs/integrations/sapling-mcp-http.md
```

### MCP Aggregator

File:

```text
backend/src/api/ai/mcp.service.ts
```

This lists and executes:

- internal Sapling MCP tools
- configured external MCP servers from `McpServerConfigItem`

External MCP server configs can use HTTP or `stdio`.

## Permissions

MCP calls use the current authenticated Sapling user.

Rules:

- generic tools use generic services and entity permissions
- semantic search loads matching records through generic service permissions
- security fields are intentionally omitted from MCP schemas
- missing permissions should fail rather than silently exposing data

## Vectorization

Main files:

```text
backend/src/api/ai/ai-vector.service.ts
backend/src/api/ai/ai-vector.utils.ts
backend/src/entity/AiVectorDocumentItem.ts
frontend/src/components/system/SaplingVectorizationDialog.vue
```

Vectorization builds chunks from selected entity records and stores embeddings in `AiVectorDocumentItem`.

Each vector document has:

- source entity handle
- source record handle
- source section
- chunk index
- title
- content
- content hash
- metadata
- provider/model handles
- embedding dimensions
- vector embedding

Content hashes avoid re-embedding unchanged chunks.

## Supported Semantic Entities

Configured in `ai-vector.utils.ts`.

```text
ticket
event
salesOpportunity
effortEstimate
effortEstimatePosition
```

Sections:

| Entity | Sections |
| --- | --- |
| `ticket` | `overview`, `problem`, `solution` |
| `event` | `overview`, `description` |
| `salesOpportunity` | `overview`, `description`, `painPoints` |
| `effortEstimate` | `overview`, `requirements` |
| `effortEstimatePosition` | `overview`, `offerText` |

## Running Vectorization

The frontend vectorization dialog lets an admin choose:

- embedding provider
- embedding model
- entity handle

Then it calls:

```text
POST /api/ai/vectorize
```

The exact route is implemented in `AiController` and handled by `AiVectorService`.

The matching vector index must exist before `semantic_search` returns semantic results.

## Semantic Search Flow

1. `semantic_search` receives `entityHandle`, `query`, and `limit`.
2. `AiVectorService` validates the entity is vectorizable.
3. It resolves the active provider/model from latest vector documents.
4. It embeds the query.
5. It retrieves nearest vector chunks.
6. It groups chunks by source record.
7. It loads accessible source records through `GenericService`.
8. It returns only records the user may read.

## Adding A Vectorizable Entity

1. Ensure the entity has useful long-text fields.
2. Add the entity handle to `VECTOR_ENTITY_HANDLES`.
3. Add sections to `VECTOR_SEARCHABLE_SECTIONS`.
4. Add relations to `VECTOR_SEARCH_RELATIONS`.
5. Add hints to `VECTOR_SEARCH_USAGE_HINTS`.
6. Add a document builder in `AiVectorService`.
7. Add frontend vectorization entity option and field labels.
8. Update MCP/AI prompt guidance if the new entity changes tool use.
9. Add or update tests for MCP forwarding/prompt expectations.

## Tool Guidance

Use:

- `ticket_search` for exact ticket numbers, external numbers, strict keywords, known fix lookup
- `semantic_search` for natural-language long-text questions
- `entity_schema` before generic create/update/filter on unfamiliar entities
- `generic_get` when the exact handle is known
- `generic_timeline` for record history/activity questions

## Common Mistakes

- Forgetting to run vectorization after adding a vectorizable entity.
- Returning vector matches without permission-filtered record loading.
- Treating `ticket_search` as a semantic search replacement.
- Adding a long-text entity to prompts but not to `VECTOR_ENTITY_HANDLES`.
- Hard-coding tool payloads instead of reading MCP schemas.
