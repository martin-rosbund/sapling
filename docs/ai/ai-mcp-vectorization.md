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
AiAgentItem
AiChatSessionItem
AiChatMessageItem
AiChatToolActionItem
AiChatTranscriptionItem
AiProviderTypeItem
AiProviderModelItem
AiVectorDocumentItem
McpServerConfigItem
```

Provider/model records are stored in the database. Runtime credentials and provider behavior are resolved by backend AI provider services.

`AiAgentItem` stores configurable Songbird profiles with an agent prompt,
optional provider/model overrides, data scopes, tool scopes, and mutation
behavior. `AiChatSessionItem.agent` keeps the chosen agent for a conversation.
Mutating generic tools are confirm-gated through `AiChatToolActionItem` when an
agent uses `mutationMode = confirm`.

### OpenAI-Compatible Local Providers

LM Studio and Ollama are registered as OpenAI-compatible local providers. They
use the normal provider/model records, so the frontend selectors do not need
special-case behavior.

Default local configuration:

```text
provider handle: lmstudio
base URL credential: lmStudioBaseUrl = http://127.0.0.1:1234/v1
chat model: openai/gpt-oss-20b
embedding model: text-embedding-nomic-embed-text-v1.5
```

Default Ollama configuration:

```text
provider handle: ollama
base URL credential: ollamaBaseUrl = http://127.0.0.1:11434/v1
chat model example: gpt-oss:20b
embedding model example: nomic-embed-text
```

Local models should set `supportsTools` only when the loaded model reliably
supports OpenAI-style tool calls. Chat still works without tools, but Songbird
will not automatically call Sapling MCP tools for that model.

Ollama model seed records are inactive by default because local installations
may not have the example models pulled yet. Pull the model in Ollama, update
`providerModel` if needed, then activate the matching `AiProviderModelItem`.

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
`McpServerConfig.allowedTools` is enforced when listing and executing external
tools. Agent policies add a second allow-list layer for both internal and
external tools.

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
knowledgeArticle
```

Sections:

| Entity | Sections |
| --- | --- |
| `ticket` | `overview`, `problem`, `solution` |
| `event` | `overview`, `description` |
| `salesOpportunity` | `overview`, `description`, `painPoints` |
| `effortEstimate` | `overview`, `requirements` |
| `effortEstimatePosition` | `overview`, `offerText` |
| `knowledgeArticle` | `overview`, `problem`, `solution`, `documentation` |

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
- `knowledge_search` for broad knowledge-base questions across curated articles, tickets, effort estimates, estimate positions, and sales opportunities
- `semantic_search` for natural-language long-text questions
- `entity_schema` before generic create/update/filter on unfamiliar entities
- `generic_get` when the exact handle is known
- `generic_timeline` for record history/activity questions

## Estimate, Opportunity, And Ticket Actions

Phase 4 exposes the existing knowledge search through ScriptButtons on
`effortEstimate`, `salesOpportunity`, and `ticket`. The buttons open Songbird
with a record-specific prompt. Songbird should first load the current record with
`generic_get`, then use `knowledge_search` across the indexed knowledge sources:

- effort estimates: compare previous estimates and estimate positions, derive
  typical positions, hour ranges, assumptions, and risks.
- sales opportunities: find similar pain points, solved cases, tickets, effort
  estimates, estimate positions, and reusable reference solutions.
- tickets: find similar cases, known fixes, knowledge articles, related effort
  estimates, estimate positions, and reference opportunities.

## AI Draft Creation

Phase 3 adds a generic entity-generation path for ScriptButtons. The shipped
`ticketKnowledgeArticle` template creates draft `knowledgeArticle` records from
ticket context through the configured/default chat provider.

The configuration lives in `aiEntityGenerationTemplate`:

- `sourceEntity`, `targetEntity`, and `actionName` bind a template to a
  ScriptButton action.
- `sourceRelations` controls which relations are loaded into the model prompt.
- `fieldMapping` maps model JSON keys to target fields.
- `sourceFieldMapping` copies deterministic values from source record paths to
  target fields, such as `contract.products.0` to `product`.
- `targetDefaults` sets fixed values such as draft status and internal
  visibility.
- `sourceReferenceField` and `userReferenceField` preserve provenance.

This keeps the first Ticket -> Knowledge Article action reusable instead of
hard-coding the target fields into `TicketController`.

## Common Mistakes

- Forgetting to run vectorization after adding a vectorizable entity.
- Returning vector matches without permission-filtered record loading.
- Treating `ticket_search` as a semantic search replacement.
- Adding a long-text entity to prompts but not to `VECTOR_ENTITY_HANDLES`.
- Hard-coding tool payloads instead of reading MCP schemas.
