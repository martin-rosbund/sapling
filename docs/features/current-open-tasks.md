# Current User And Open Tasks

The current-user layer provides the authenticated profile, resolved permissions, entity metadata batches, work-week data, starter workspace setup, inbox read state, and live open-task snapshots for the header.

## Main Files

```text
backend/src/api/current/current.controller.ts
backend/src/api/current/current.service.ts
backend/src/api/current/current-metadata.service.ts
backend/src/api/current/open-task-events.service.ts
backend/src/api/current/dto/
frontend/src/stores/currentPersonStore.ts
frontend/src/stores/currentPermissionStore.ts
frontend/src/composables/system/useOpenTaskCountEvents.ts
frontend/src/composables/system/useSaplingHeader.ts
frontend/src/components/system/SaplingHeader.vue
frontend/src/components/system/header/
frontend/src/components/account/SaplingInbox.vue
frontend/src/utils/inboxRoute.util.ts
```

## Current Endpoints

All `/api/current/*` endpoints require `SessionOrBearerAuthGuard`.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/current/person` | Reloads the authenticated user profile |
| `POST /api/current/changePassword` | Changes current user's password |
| `GET /api/current/openTaskCountEvents` | Server-sent event stream for open-task snapshots |
| `POST /api/current/inboxNotification/:handle/read` | Marks one inbox notification as read |
| `GET /api/current/permission` | Returns all resolved entity permissions |
| `GET /api/current/permission/:entityHandle` | Returns one entity permission snapshot |
| `GET /api/current/meta?entities=...` | Batched entity definitions, templates, and permissions |
| `GET /api/current/workWeek` | Current user's work-week configuration |

`GET /api/current/person` also preserves impersonation context by adding `_impersonator` to the returned profile when the session serializer attached it.

## Starter Workspace

`CurrentService.getPerson()` calls `ensureStarterWorkspace()` before returning the profile.

If the person has role starter templates and no personal data yet:

- dashboard templates are copied into `DashboardItem`
- favorite templates are copied into `FavoriteItem`

This makes first login setup data-driven through role seed files rather than hard-coded frontend behavior.

## Open Task Snapshot

`OpenTaskSnapshot` contains:

| Field | Source |
| --- | --- |
| `tickets` | Assigned tickets with status not `closed` |
| `tasks` | Participating events with status not `canceled` or `completed` |
| `salesOpportunities` | Assigned active sales opportunities |
| `effortEstimates` | Assigned active effort estimates with status not `completed` or `cancelled` |
| `notifications` | Unread inbox notifications |
| `count` | Sum of all snapshot collections |

Current open filters are implemented in `CurrentService`:

```text
buildOpenTicketWhere()
buildOpenEventWhere()
buildOpenSalesOpportunityWhere()
buildOpenEffortEstimateWhere()
```

When onboarding a new open-task entity, update both backend snapshot composition and frontend stream item mapping.

## SSE Flow

`OpenTaskEventsService` keeps an in-memory subscriber set per user handle.

Flow:

1. Frontend calls `new EventSource(BACKEND_URL + 'current/openTaskCountEvents', { withCredentials: true })`.
2. Backend subscribes through `streamForUser(user.handle)`.
3. The stream emits an initial snapshot immediately.
4. Other services call `notifyUsers([...handles])` when open-task-relevant data changes.
5. The controller reloads a fresh snapshot and emits event type `open-task-snapshot`.
6. The frontend computes newly appearing items by comparing snapshot item ids.
7. `SaplingHeader` updates the badge and optional incoming preview.

The SSE stream is process-local. In multi-instance deployments, open-task notifications need shared event transport or sticky sessions if live updates must cross instances.

## Header Behavior

`useSaplingHeader()` owns:

- current profile loading
- inbox dialog state
- account dialog state
- inbox badge count
- badge color based on unread notification count
- incoming inbox preview item
- admin-only header actions
- impersonation return action

`useOpenTaskCountEvents()` maps snapshot records to route-aware stream items:

| Kind | Route utility |
| --- | --- |
| `ticket` | `getTicketInboxRoute()` |
| `event` | `getTaskInboxRoute()` |
| `salesOpportunity` | `getSalesOpportunityInboxRoute()` |
| `effortEstimate` | `getEffortEstimateInboxRoute()` |
| `notification` | `getNotificationInboxRoute()` |

## Extension Checklist

When adding an entity to open tasks:

1. Add a query method to `CurrentService`.
2. Add the collection to `OpenTaskSnapshot`.
3. Add it to `getOpenTaskSnapshot()` count calculation.
4. Add frontend snapshot typing in `useOpenTaskCountEvents.ts`.
5. Add a stream item mapper with title, body, icon, timestamp, and route.
6. Add route helper in `inboxRoute.util.ts`.
7. Trigger `OpenTaskEventsService.notifyUsers()` from the relevant write path.
8. Update tests for `CurrentService`, inbox routes, and header preview if behavior changes.

## Verification

Useful commands:

```powershell
npm test --prefix backend -- current.service.spec.ts --runInBand
npm run type-check:backend
npm run type-check:frontend
.\node_modules\.bin\vitest.cmd run src\components\system\header\__tests__\SaplingHeaderInboxPreview.test.ts
```

Also verify in the browser that the header count updates after creating or marking relevant inbox/task records.
