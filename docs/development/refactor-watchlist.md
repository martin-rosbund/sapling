# Refactor Watchlist

This note tracks files that are healthy enough to leave as-is for now, but should be watched when nearby work happens. Prefer incremental extraction during feature work over broad refactors without a concrete change driver.

Last reviewed: 2026-06-16

## Keep An Eye On

| File | Why it is on the list | Next useful extraction |
| --- | --- | --- |
| `frontend/src/composables/event/useSaplingEvent.ts` | Still owns many event-calendar workflows after the helper extraction. | Move drag/resize interaction and context-menu handling into focused composables. |
| `backend/src/api/generic/generic.service.ts` | Still coordinates a broad set of generic CRUD workflows. | Promote update-conflict evaluation or change-log persistence into dedicated services when touched again. |
| `frontend/src/components/system/SaplingAiChat.vue` | The shell still coordinates runtime loading, sessions, streaming, and composer/session orchestration after voice input extraction. | Extract session list/runtime selector or stream orchestration next. |
| `frontend/src/components/import/SaplingImportWorkspace.vue` | Still combines template management, matching, relation mapping, and import execution after preview/setup/dialog, mapping editor, polling, and report-helper extraction. | Extract template editor and AI matching/suggestion orchestration next. |
| `frontend/src/components/system/SaplingFormConfigAdmin.vue` | Still owns entity/config selection, scope metadata, validation, import/export, and save orchestration after preview and field-list extraction. | Extract entity/scope chooser and JSON import/export panel next. |
| `frontend/src/components/dialog/SaplingDialogEdit.vue` | Dialog shell remains large even after most logic moved into composables. | Extract form config menu/selector and conflict/dirty-state presentation into focused child components. |
| `frontend/src/components/crm/SaplingCrmWorkspace.vue` | Workflow view still mixes lists, relationship panels, and activity loading after toolbar extraction. | Split sales/account/customer-success panels and activity-signal side rail next. |
| `frontend/src/views/AiAgentBuilderView.vue` | Route-level builder mixes agent metadata, version editing, provider/model controls, workbench, and evaluation UI; generic entity/role selectors are now using Sapling field components. | Extract runtime selectors, version editor, workbench run panel, and evaluation panel. |
| `frontend/src/composables/table/useSaplingTableActions.ts` | Table actions still mix exports, favorites, delete flows, scripts, and dialogs. | Split favorites handling or delete/bulk-delete flows into focused composables. |
| `backend/src/api/ai/sapling-mcp.service.ts` and `backend/src/api/ai/ai.service.ts` | Larger AI/MCP backend hotspots with higher behavioral risk. | Refactor only with focused tests around the specific AI/MCP behavior being changed. |

## Rule Of Thumb

- Do not refactor these files just because they are long.
- Extract cohesive behavior when a feature or bug fix already touches the area.
- Keep typechecks and focused tests close to each extraction.
