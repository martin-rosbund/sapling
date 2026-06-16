# API Refactor Decision Matrix

Last reviewed: 2026-06-16

Sapling should expose ordinary entity CRUD through the generic API. Specialized
controllers are kept only when the endpoint represents workflow orchestration,
current-user semantics, file or stream handling, provider integration, or an
aggregate/read model that cannot be represented safely as generic entity CRUD.

## Decision Rules

| Rule | Generic API candidate | Specialized endpoint |
| --- | --- | --- |
| Registered entity | Entity handle exists in `ENTITY_REGISTRY` and the route performs list/create/update/delete on that entity. | No registered entity owns the response, or several entities are orchestrated together. |
| Permissions | `GenericPermissionGuard` maps cleanly to read/insert/update/delete. | Permission depends on current-user context, admin-only workflow, provider token ownership, or custom action rules. |
| Payload | Payload is a normal entity record accepted by `GenericService`. | Payload needs validation, normalization, file parsing, streaming, AI/tool execution, or external provider calls before persistence. |
| Response | Response is the entity record, generic page, timeline, change log, or export. | Response is computed, aggregated, streamed, binary, preview-only, or action-specific. |
| Side effects | Only normal generic mutation side effects apply. | Route sends mail, triggers webhooks, imports calendars, executes scripts, starts jobs, or mutates current sessions. |

## Controller Matrix

| Area | Current routes | Decision | Notes |
| --- | --- | --- | --- |
| `api/generic` | Generic list, import, create, update, delete, references, timeline, change log, download | Keep generic | Primary CRUD surface. Prefer adding generic capability here only when broadly useful. |
| `api/template` | `GET /api/template/:entityHandle` | Keep specialized | Runtime metadata, not entity CRUD. |
| `api/form-config` | Effective template, list, validate, export, create, update, import | Mixed | `effective-template`, `validate`, and `export` stay specialized. List/create/update/import target `saplingFormConfig`, but save paths currently validate and normalize JSON, so keep wrappers until equivalent generic validation exists. |
| `api/import` | Batch analyze/open/detail/error rows/source values/match/configure/suggest/execute, template list/create/update | Mixed | Batch routes stay specialized. Template reads can use generic `importTemplate` with `source`, `targetEntity`, and `valueMappings` relations. Template create/update still use specialized wrappers because the DTO maps source/entity/mapping/value rules. |
| `api/ai` | MCP, provider/model lookup, transcription, speech, vectorization, chat sessions/messages, tool actions, agent workbench/runs/evaluations | Mixed | Provider/model/agent lookup can be replaced by generic reads where callers do not need curated filtering. Chat, stream, attachments, speech, vectorization, tool actions, workbench, runs, and evaluations stay specialized. |
| `api/current` | Person, profile, password, sessions, inbox read, permissions, metadata batch, work week, calendar sync, SSE | Keep specialized | Current-user and session scoped behavior. Generic `person` or `inboxNotification` calls cannot safely infer the same subject. |
| `api/document` | Upload, download, preview | Keep specialized | Multipart and binary/preview behavior. Document records remain generic for metadata listings. |
| `api/kpi` | Execute KPI | Keep specialized | Computed aggregate/read model, not KPI CRUD. `kpi` entity CRUD remains generic. |
| `api/mail` | Senders, preview, send | Keep specialized | Message rendering and delivery side effects. Mail templates/deliveries are generic entities where normal CRUD is needed. |
| `api/webhooks` | Trigger, retry | Keep specialized | Explicit workflow side effects. Webhook subscription/delivery records remain generic. |
| `api/script` | Run client/server scripts | Keep specialized | Script execution is an action surface, not CRUD. |
| `api/system` | CPU, memory, filesystem, network, OS, time, version, state | Keep specialized | Operational metrics and health state. |
| `api/github` | Repository, releases, issues, create issue | Keep specialized or classify as optional integration | External GitHub proxy. Review whether the feature is product-facing or development-only before removal. |
| `auth` | Login, OAuth callbacks, passkeys, provider users, impersonation, tokens, logout | Keep specialized | Authentication, identity-provider, and session behavior. |
| `calendar/azure`, `calendar/google` | Event push/import | Keep specialized | External provider calls. Refactor shared provider code behind the controller instead of genericizing routes. |
| `app.controller` | Health/root, echo | Keep specialized or remove if unused | `echo` should be verified as dev-only before removal. |

## Near-Term Migration Candidates

1. Keep `api/form-config` save routes as wrappers while generic-compatible validation/normalization lives in `FormConfigService.prepareSavePayload`.
2. Continue migrating low-risk reads before writes: frontend import template listing now uses `ApiGenericService.find('importTemplate')`, while create/update stay specialized until the write DTO can be represented generically.
3. Evaluate AI provider/model read endpoints per caller. Prefer `ApiGenericService.find('aiProviderType')` and `ApiGenericService.find('aiProviderModel')` when no curated route behavior is needed.
4. Add tests before removing any compatibility route. Endpoint removal should fail in `domain-endpoints.spec.ts` if it is accidental.

## Removal Checklist

- No frontend service, composable, component, route, or store references the specialized URL.
- No seeded script button or dynamic route constructs the URL.
- Swagger/docs mention the generic replacement.
- Permission behavior matches or is deliberately changed and documented.
- Targeted backend and frontend tests cover the replacement path.
