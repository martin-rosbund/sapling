# Configurable AI Agents

Sapling AI agents are admin-managed chat profiles for Songbird. They reuse the existing chat runtime, provider/model records, internal Sapling MCP tools, external MCP server configs, and semantic search. An agent does not start a separate orchestration stack; it scopes the normal Songbird runtime.

## Main Files

```text
backend/src/entity/AiAgentItem.ts
backend/src/entity/AiChatToolActionItem.ts
backend/src/api/ai/ai-agent-policy.service.ts
backend/src/api/ai/ai.service.ts
backend/src/api/ai/mcp.service.ts
frontend/src/views/AiAgentBuilderView.vue
frontend/src/components/system/SaplingAiChat.vue
```

## Agent Model

`AiAgentItem` stores:

- profile fields such as title, description, icon, color, welcome message, and starters
- `promptMarkdown` for agent-specific system instructions
- optional provider/model overrides
- data scope through `allowedEntityHandles` and `allowedKnowledgeEntityHandles`
- tool scope through `allowedInternalTools` and `allowedExternalTools`
- `mutationMode`, currently `confirm` or `readOnly`
- optional role visibility; no roles means visible to all users with chat access

`AiChatSessionItem.agent` stores the selected agent for a conversation. Existing sessions keep their agent; new chats use the selected or default active agent.

## Tool Policy

The chat runtime asks `AiAgentPolicyService` to convert an agent into an MCP policy. The policy is enforced in two places:

1. Tool listing, so the model only sees allowed tools.
2. Tool execution, so direct or repeated tool calls cannot bypass the policy.

Internal Sapling tools also enforce entity scope. For example, `generic_get`, `generic_list`, `semantic_search`, and generic mutations reject disallowed entity handles. `entity_catalog` and `entity_search` are filtered to the allowed entities.

External MCP tools must match `allowedExternalTools`, using either `toolName` or `serverName.toolName`. `McpServerConfig.allowedTools` is also enforced independently for each server.

## Confirmed Mutations

Agents with `mutationMode = confirm` do not execute `generic_create`, `generic_update`, or `generic_delete` immediately. Instead, Sapling creates an `AiChatToolActionItem` with status `pending`.

The frontend renders pending actions in the chat. The user can:

- confirm, which calls `POST /api/ai/chat/tool-actions/:handle/confirm`
- reject, which calls `POST /api/ai/chat/tool-actions/:handle/reject`

The confirm endpoint reloads the stored action, checks ownership, expiry, and agent policy again, then executes the exact stored tool call.

## Builder

The guided builder lives at:

```text
/ai-agents
```

It saves through the generic `aiAgent` API and uses `GET /api/ai/chat/tools` to show active internal and external MCP tools.

## Extension Notes

- Add new internal tools to agent seed scopes when they should be available to seeded agents.
- Keep mutating tools confirm-gated unless the product explicitly chooses a stronger automation mode.
- Add specialized builder controls only when JSON fields become too error-prone for administrators.
