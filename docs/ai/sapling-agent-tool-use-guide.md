# AI Prompting And Tool Use Guide For Sapling Agents

This guide describes how an AI agent should work with Sapling data through MCP and the generic API. It is intentionally operational: start with metadata, respect permissions, prefer reversible reads, and only mutate after the target entity and payload shape are understood.

## Core Files

```text
backend/src/api/ai/sapling-mcp.service.ts
backend/src/api/ai/sapling-mcp-tool-definitions.ts
backend/src/api/ai/prompts/sapling-mcp.prompts.ts
backend/src/api/ai/sapling-mcp-permission.service.ts
backend/src/api/ai/ai.service.ts
backend/src/api/generic/generic.service.ts
backend/src/api/template/template.service.ts
backend/src/entity/global/entity.registry.ts
```

Related docs:

```text
docs/ai/ai-mcp-vectorization.md
docs/integrations/sapling-mcp-http.md
docs/api/generic-api.md
docs/architecture/entity-metadata.md
docs/security/permissions.md
```

## Agent Principles

1. Inspect before acting.
2. Use entity handles and field names from Sapling metadata, not guesses.
3. Read with the current user's permissions.
4. Prefer semantic search for natural-language long text and generic filters for exact structured data.
5. Treat generated handles and raw primary keys as internal unless the user asks for them.
6. Do not expose passwords, token secrets, provider secrets, or security fields.
7. Summarize business meaning, not raw JSON, unless the user asks for JSON.
8. Mutate only when the user clearly asked for a change.

## Available Internal MCP Tools

The internal server currently registers these tools:

| Tool | Use |
| --- | --- |
| `current_person` | Safe context about the authenticated user. |
| `entity_catalog` | List registered entity handles. |
| `entity_search` | Discover likely entity handles by term, field, or relation. |
| `entity_schema` | Inspect fields, relations, required flags, options, and operators. |
| `generic_list` | List records with filters, sorting, pagination, and optional relations. |
| `generic_get` | Load one record by handle. |
| `generic_timeline` | Load record-centric related activity by month. |
| `ticket_search` | Keyword search across ticket text fields. |
| `semantic_search` | Vector search across indexed long-text entities. |
| `knowledge_search` | Combined semantic knowledge search across articles, tickets, estimates, estimate positions, and opportunities. |
| `generic_create` | Create a generic record. |
| `generic_update` | Update a generic record. |
| `generic_delete` | Delete a generic record. |

The HTTP MCP endpoint exposes the same tool surface through streamable HTTP sessions.

## Recommended Read Workflow

For an unfamiliar topic:

1. Call `entity_search` with a rough term.
2. Call `entity_schema` for the best candidate entity.
3. Use `generic_list` with small `limit` and explicit `relations` only when needed.
4. Use `generic_get` once the exact record handle is known.
5. Use `generic_timeline` when the user asks about activity, chronology, related records, or surrounding history.

For a natural-language support or CRM question:

1. Use `semantic_search` against the most likely indexed entity.
2. Use `generic_get` for promising result handles.
3. Use `generic_timeline` for context around the selected record.
4. Summarize the answer with record labels and only the necessary handles.

## Choosing Search Tools

Use `ticket_search` when:

- the user mentions a ticket number or external reference
- exact keywords matter
- they ask for known fixes or workarounds in ticket solutions

Use `semantic_search` when:

- the user describes a problem in natural language
- wording may differ from stored records
- the relevant content is in long markdown/text fields

Use `knowledge_search` when:

- the user asks for a known solution, troubleshooting guidance, reusable implementation knowledge, estimation patterns, or sales arguments
- the relevant source could be a curated knowledge article, ticket, effort estimate, estimate position, or sales opportunity
- you want one permission-filtered search before drilling into a specific record

Supported semantic entities currently include:

- `ticket`
- `event`
- `salesOpportunity`
- `effortEstimate`
- `effortEstimatePosition`
- `knowledgeArticle`

Use `generic_list` when:

- the user asks for structured filters, counts, statuses, dates, or assigned records
- exact relation fields are known
- the answer depends on current field values rather than long text similarity

## Working With Schemas

Always inspect `entity_schema` before composing filters or mutation payloads for an entity you do not know.

Important schema fields:

- `name`: payload and filter field name
- `kind`: relation kind such as `m:1` or `1:m`
- `referenceName`: target entity handle
- `isRequired`: required create/update context
- `options`: Sapling decorators such as `isValue`, `isMarkdown`, `isChip`, `isMoney`, `isDateStart`, `isSecurity`
- `relationNames`: valid relations for population
- `referenceDependency`: dependency constraints for reference fields

For relation filters, prefer nested filters such as:

```json
{
  "assigneePerson": {
    "handle": 12
  }
}
```

Use MikroORM operators with a leading `$`:

```json
{
  "title": {
    "$ilike": "%backup%"
  },
  "status": {
    "$in": ["new", "inProgress"]
  }
}
```

## Mutation Workflow

Before creating:

1. Inspect `entity_schema`.
2. Identify required fields.
3. Resolve references by handle with `generic_list` or `generic_get`.
4. Do not send generated primary keys or read-only fields.
5. Send only meaningful business fields.

Before updating:

1. Load the current record with `generic_get`.
2. Confirm the field exists and is not security-only.
3. Send a small partial payload.
4. Request relations only if the response needs them.
5. Explain the business change, not the raw mutation response.

Before deleting:

1. Confirm the exact entity and handle.
2. Prefer asking for explicit confirmation unless the user's instruction is already explicit.
3. Be aware that delete participates in change logging but may still remove operational data.

## Prompting Guidance

Good agent prompts should include:

- the user's goal
- known entity handles or record handles
- whether the task is read-only or may mutate data
- output style, such as concise summary, table, or action list
- any business constraints, such as "only open tickets" or "current user's records"

Avoid prompts that ask the agent to:

- guess entity names without metadata lookup
- bypass permissions
- expose credentials or token contents
- create records without resolving references
- produce broad raw JSON dumps when a business answer is expected

## Safe Answering Patterns

When results are partial:

- Say what was searched.
- Say which filters or entities were used.
- Mention permission boundaries if likely relevant.
- Offer the next concrete query or action.

When a tool returns an error:

- Use `entity_search` if the entity handle is uncertain.
- Use `entity_schema` if a field, relation, or filter may be invalid.
- Reduce filters to a smaller known-good query.
- Retry only after changing the cause, not blindly.

When summarizing record data:

- Prefer labels, titles, status, assignee, customer, relevant dates, and short excerpts.
- Keep raw handles available but secondary.
- Do not include hidden/security fields.

## Navigation And Location Questions

For "where is this in Sapling?" questions:

1. Use `entity_catalog` or `entity_search`.
2. Inspect `entity`, `entityGroup`, and `entityRoute`.
3. Treat `entity.group` as the menu group.
4. Treat `entityGroup.parent` as optional hierarchy.
5. Treat `entityRoute.route` as the frontend route.

## Timeline And History Questions

Use `generic_timeline` for:

- related activity around a known record
- monthly history
- linked tickets/events/opportunities/effort estimates
- date-span questions

Use `generic_list` on `changeLog` only when persisted field-change audit is required and the user has access. There is no dedicated MCP `change_log` tool yet.

## Operational Boundaries

The MCP server uses the authenticated user. Tool calls are not superuser operations. Permissions, read filters, sanitization, and mutation checks still apply.

Agents should not infer that missing records do not exist globally. A missing result may mean:

- wrong entity handle
- wrong field/filter
- no matching record
- insufficient permission
- not yet indexed for semantic search

## Verification Checklist For Agent Changes

- `entity_schema` was used before unfamiliar filters or payloads.
- Filters use valid field and relation names.
- Semantic search was followed by exact record loading before final claims.
- Mutations are small and user-intended.
- The final answer mentions what changed or what was found.
- No secrets, token values, or security fields are exposed.
