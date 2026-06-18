# Sapling MCP HTTP API

Sapling exposes its internal Model Context Protocol server through the authenticated backend API. Other products can use this endpoint when they can act as an MCP client and authenticate as a Sapling user or service account.

## Endpoint

The MCP endpoint is available below the AI API:

```text
POST   /api/ai/mcp
GET    /api/ai/mcp
DELETE /api/ai/mcp
```

These routes use the streamable HTTP MCP transport. They are not simple REST tool endpoints; clients should speak MCP JSON-RPC over streamable HTTP.

## Authentication

The route is protected by Sapling's `SessionOrBearerAuthGuard`.

Supported access patterns:

- Browser/session based clients can use the existing Sapling session cookie.
- Server-to-server clients should use a Sapling bearer token and send it as:

```http
Authorization: Bearer <token>
```

All MCP tool calls run with the permissions of the authenticated Sapling user. If a user cannot read, create, update, or delete an entity in Sapling, the MCP tool will be denied in the same way.

## Session Flow

1. Send an MCP `initialize` request to `POST /api/ai/mcp`.
2. Read the `mcp-session-id` response header.
3. Send all follow-up `POST`, `GET`, and `DELETE` requests with that header.
4. End the session with `DELETE /api/ai/mcp`.

Example headers:

```http
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json, text/event-stream
mcp-session-id: <session-id-from-initialize-response>
```

Sapling binds the MCP session to the authenticated user. Reusing a session id with another user is rejected.

## Initialize Example

Most MCP SDKs perform this request automatically. A raw request looks like this:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "external-product",
      "version": "1.0.0"
    }
  }
}
```

POST it to:

```text
/api/ai/mcp
```

The response includes the MCP session id in the `mcp-session-id` header.

## Tool Discovery

After initialization, use the standard MCP `tools/list` request. Sapling currently exposes these internal tools:

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
knowledge_search
generic_create
generic_update
generic_delete
```

The exact schema for each tool is returned by `tools/list`. Clients should inspect tool schemas instead of hard-coding payloads.

## Response Contract

Tool responses are JSON text payloads shaped for model consumption. They may
include technical record handles so a client can make follow-up calls, but
clients should prefer user-facing fields such as `displayValue`, titles,
numbers, status labels, and relation display values when presenting answers.

Sapling treats the current tool schemas as the compatibility surface for the
HTTP MCP endpoint. Additive response fields are allowed. Breaking request
schema changes, removed fields, or changed authentication/session behavior
require a documented version change.

Internally, Songbird may derive chat UI navigation links from successful tool
results. That UI affordance is not part of the external MCP protocol response:
external clients should build their own navigation from returned entity handles
and record handles, or use Sapling frontend routes only when they intentionally
target the Sapling web app.

## Tool Call Example

After initialization, send tool calls to `POST /api/ai/mcp` with the `mcp-session-id` header.

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "semantic_search",
    "arguments": {
      "entityHandle": "ticket",
      "query": "Sage startet nach Update nicht mehr",
      "limit": 5
    }
  }
}
```

`semantic_search` supports active vector indexes for:

```text
ticket
event
salesOpportunity
effortEstimate
effortEstimatePosition
knowledgeArticle
```

The matching vector index must already exist. Run vectorization in Sapling before using semantic search for an entity.

Use `knowledge_search` when the client wants a combined knowledge-base lookup across curated knowledge articles, tickets, effort estimates, estimate positions, and sales opportunities. It still uses the authenticated user's permissions and skips sources the user cannot read.

## Generic Entity Access

The generic tools use Sapling entity handles:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "generic_list",
    "arguments": {
      "entityHandle": "salesOpportunity",
      "filter": {
        "isActive": true
      },
      "limit": 10
    }
  }
}
```

Recommended flow for unknown entities:

1. Use `entity_search` or `entity_catalog`.
2. Use `entity_schema` for fields, relations, required flags, and Sapling options.
3. Call `generic_list`, `generic_get`, `generic_create`, `generic_update`, or `generic_delete`.

For filters, use MikroORM-style operators such as `$eq`, `$in`, `$ilike`, `$and`, and `$or`.

## Error Handling

Sapling returns MCP JSON-RPC errors. Common cases:

| Situation | Result |
| --- | --- |
| Missing or invalid session id | JSON-RPC error, usually `-32000` or `-32001` |
| User does not own the session | Permission denied |
| User lacks entity permission | Permission denied |
| Tool name does not exist | Tool not found |
| Semantic index missing | Successful response with `indexed: false` and usage hints |
| Invalid generic filter field | Successful response with `queryExecuted: false`, `status: "needs_schema_retry"`, and repair hints |
| Confirm-gated mutation in Songbird chat | Stored pending action in Sapling chat; external MCP calls execute according to the authenticated user's permissions |

## Security Notes

- Use HTTPS in production.
- Prefer dedicated service users for product integrations.
- Grant only the Sapling roles and entity permissions the external product needs.
- Do not expose raw session ids or bearer tokens to browsers unless the product is intentionally acting as the authenticated user.
- Do not assume internal numeric handles are user-facing identifiers. MCP responses may include handles as technical metadata.
- Log and monitor external tool usage by user, tool name, entity handles, status,
  duration, and result count in production deployments.
- Consider gateway or reverse-proxy rate limits for `/api/ai/mcp` when exposing
  the endpoint beyond a trusted internal network.

## Related Implementation Files

```text
backend/src/api/ai/ai.controller.ts
backend/src/api/ai/sapling-mcp.service.ts
backend/src/api/ai/sapling-mcp-tool-definitions.ts
backend/src/api/ai/sapling-mcp-permission.service.ts
backend/src/api/ai/mcp.service.ts
```
