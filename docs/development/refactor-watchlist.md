# Refactor Watchlist

This note tracks files that are healthy enough to leave as-is for now, but should be watched when nearby work happens. Prefer incremental extraction during feature work over broad refactors without a concrete change driver.

Last reviewed: 2026-05-27

## Keep An Eye On

| File | Why it is on the list | Next useful extraction |
| --- | --- | --- |
| `frontend/src/composables/event/useSaplingEvent.ts` | Still owns many event-calendar workflows after the helper extraction. | Move drag/resize interaction and context-menu handling into focused composables. |
| `backend/src/api/generic/generic.service.ts` | Still coordinates a broad set of generic CRUD workflows. | Promote update-conflict evaluation or change-log persistence into dedicated services when touched again. |
| `frontend/src/components/system/SaplingAiChat.vue` | The shell still coordinates runtime loading, sessions, streaming, and voice input. | Move voice input/recording into a dedicated composable. |
| `frontend/src/composables/table/useSaplingTableActions.ts` | Table actions still mix exports, favorites, delete flows, scripts, and dialogs. | Split favorites handling or delete/bulk-delete flows into focused composables. |
| `backend/src/api/ai/sapling-mcp.service.ts` and `backend/src/api/ai/ai.service.ts` | Larger AI/MCP backend hotspots with higher behavioral risk. | Refactor only with focused tests around the specific AI/MCP behavior being changed. |

## Rule Of Thumb

- Do not refactor these files just because they are long.
- Extract cohesive behavior when a feature or bug fix already touches the area.
- Keep typechecks and focused tests close to each extraction.
