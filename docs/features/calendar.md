# Calendar And Recurrence

Sapling calendar events are normal metadata-driven entities with an additional delivery layer for external calendar systems. The internal event is the source of truth; Azure and Google synchronization are projections of that event.

## Main Files

```text
backend/src/entity/EventItem.ts
backend/src/entity/EventTypeItem.ts
backend/src/entity/EventStatusItem.ts
backend/src/entity/EventDeliveryItem.ts
backend/src/entity/EventDeliveryStatusItem.ts
backend/src/entity/EventAzureItem.ts
backend/src/entity/EventGoogleItem.ts
backend/src/calendar/calendar.recurrence.ts
backend/src/calendar/event.delivery.service.ts
backend/src/calendar/calendar.processor.ts
backend/src/calendar/calendar-delivery.executor.ts
backend/src/calendar/sync/
backend/src/calendar/azure/
backend/src/calendar/google/
frontend/src/composables/event/useSaplingEvent.ts
frontend/src/components/dialog/fields/SaplingFieldEventRecurrence.vue
frontend/src/utils/eventRecurrence.ts
frontend/src/utils/__tests__/eventRecurrence.test.ts
```

## Event Model

`EventItem` represents appointments, meetings, reminders, and related CRM/service events.

Important fields:

| Field | Meaning |
| --- | --- |
| `title` | Display title and primary value |
| `description` | Markdown description; also part of AI vectorization |
| `startDate`, `endDate` | Event time range |
| `isAllDay` | Marks all-day events |
| `isPrivate` | Marks owner-only events, including Outlook events imported with private sensitivity |
| `recurrenceRule` | Optional RRULE string for recurring events |
| `onlineMeetingURL` | Optional meeting link |
| `type` | Event category; controls default-calendar behavior |
| `status` | Current event status; `EventStatusItem.isOpen` controls the default open-status calendar filter |
| `assigneeCompany`, `assigneePerson` | Internal owner |
| `creatorCompany`, `creatorPerson` | Creator context |
| `ticket` | Optional ticket relation |
| `salesOpportunity` | Optional sales opportunity relation |
| `participants` | Person collection for attendees |
| `azure`, `google` | External calendar projection records |

`EventTypeItem.showInDefaultCalendar` is important for delivery. If it is `false`, the event stays in Sapling and is not queued for external default-calendar synchronization.

## Recurrence Contract

Sapling stores recurrence in `EventItem.recurrenceRule` as an RFC5545-like RRULE string. The backend parser accepts rules with or without the `RRULE:` prefix and normalizes the supported parts.

Supported RRULE parts:

| Part | Supported values |
| --- | --- |
| `FREQ` | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` |
| `INTERVAL` | Positive integer |
| `BYDAY` | Weekday list using `MO`, `TU`, `WE`, `TH`, `FR`, `SA`, `SU` |
| `COUNT` | Positive integer occurrence limit |
| `UNTIL` | UTC end date in compact RRULE format |

External providers receive provider-specific forms:

| Provider | Conversion |
| --- | --- |
| Google | `buildGoogleRecurrence()` returns `["RRULE:<rule>"]` |
| Azure | `buildAzureRecurrence(startDate, rule)` returns a Microsoft Graph recurrence object |

Azure conversion maps:

| Frequency | Azure behavior |
| --- | --- |
| `DAILY` | `daily` pattern |
| `WEEKLY` | `weekly` pattern with `daysOfWeek`; falls back to the start date weekday when `BYDAY` is missing |
| `MONTHLY` | `absoluteMonthly` pattern on the start date day |
| `YEARLY` | `absoluteYearly` pattern on the start date month/day |

The frontend recurrence UI builds the same persisted RRULE string. Keep frontend and backend parsers aligned whenever recurrence semantics change.

## Delivery Flow

Calendar delivery starts after an event change asks for synchronization.

1. `EventDeliveryService.queueEventDelivery(event, payload)` checks whether the event type is visible in the default calendar.
2. A pending `EventDeliveryItem` is persisted with the event and payload.
3. If Redis/BullMQ is enabled, the `calendar` queue receives a `deliver-calendar-event` job.
4. If Redis is disabled, `CalendarDeliveryExecutor.execute()` runs directly as a synchronous fallback.
5. `CalendarProcessor` executes queued jobs and passes the delivery id to the executor.
6. Azure and Google services update or create provider-side calendar items and persist `EventAzureItem` / `EventGoogleItem` references.

Retries use `EventDeliveryService.retryDelivery(handle)`. The delivery is reset to pending, `nextRetryAt` is cleared, and the same queue-or-direct execution path is used.

## Provider Import

The calendar page can manually fetch external provider events for the currently visible date range through:

```text
POST /api/azure/events/import
POST /api/google/events/import
```

The Azure endpoint uses the signed-in user's stored Microsoft session (`PersonSessionItem`) and Microsoft Graph calendar view. Returned Outlook items are matched by `EventAzureItem.referenceHandle`. The Google endpoint uses the signed-in user's stored Google session and Google Calendar events list. Returned Google items are matched by `EventGoogleItem.referenceHandle`.

Existing Sapling events are updated and unknown provider items are created as internal scheduled events for the current user. Known attendee email addresses are linked as participants when matching `PersonItem` records exist. The current user is always added as a participant so imported events appear in their calendar filter.

Outlook events whose Microsoft Graph `sensitivity` is `private` are imported with `EventItem.isPrivate = true`. Sapling still stores the full event details for the importing owner, but generic Event reads, exports, relation mutations, updates, deletes, KPIs, and timeline anchor loads must only expose private events when `creatorPerson` is the current user. Non-private events keep the normal Event permission behavior.

This import is intentionally user-triggered. It does not require provider webhooks and relies on the existing Microsoft or Google login scopes instead of a separate calendar-only setup.

## Automatic Outlook Import

Automatic Outlook polling is configured per user through `CalendarSyncSubscriptionItem`. The account dialog exposes the current user's subscription through:

```text
GET /api/current/calendarSync
PATCH /api/current/calendarSync
```

The subscription stores whether automatic import is active, the import range (`day`, `week`, or `month`), the polling interval in minutes, and the latest run/result metadata. Tokens remain in `PersonSessionItem`; the subscription only references the person.

When Redis is enabled, `CalendarSyncModule` registers a BullMQ `calendar-sync` queue. On startup it adds a repeatable `schedule-calendar-imports` job, which finds due active Outlook subscriptions and enqueues one `import-calendar-for-subscription` job per user. Each import job calls the same `AzureCalendarService.importEvents()` path as the manual Outlook button. When Redis is disabled, automatic import is not scheduled.

Private Outlook events use the same automatic import path as manual imports, so privacy behavior is identical for both flows. Existing imported records are not retroactively reclassified unless a later Outlook import updates the matching event.

## Frontend Behavior

`useSaplingEvent.ts` owns the calendar view behavior:

- Load events and recurring series for the visible range.
- Expand recurring events for display.
- Create, drag, resize, and update calendar events.
- Manually fetch Azure or Google events for the visible range and refresh the calendar.
- Skip external-calendar assumptions for event types where `showInDefaultCalendar` is `false`.
- Keep non-recurring edits separate from recurring occurrence handling.

`SaplingFieldEventRecurrence.vue` is the editable recurrence field used by generic dialogs. Shared parsing and expansion helpers live in `frontend/src/utils/eventRecurrence.ts`.

The shared work filter used by calendar and partner views includes one
multi-select group for each `m:1` or `1:1` reference marked with
`@Sapling(['isChip'])`. For reference records with an `isOpen` boolean, the
initial selection uses records where `isOpen` is `true`; other chip filters
start with all reference records selected. Generic tables apply the same
`isOpen` convention to `m:1` chip references as a visible default column filter;
references without an `isOpen` field keep the previous all-values behavior.

## Extension Checklist

When changing recurrence:

1. Update `backend/src/calendar/calendar.recurrence.ts`.
2. Update `frontend/src/utils/eventRecurrence.ts`.
3. Update `SaplingFieldEventRecurrence.vue` if the UI needs new controls.
4. Add or update backend recurrence tests.
5. Add or update frontend recurrence tests.
6. Check Azure and Google provider conversion explicitly.

When adding a new calendar-related entity or status:

1. Add the entity file and registry entry.
2. Add entity, route, translation, and permission seed files.
3. Add migration only if the database schema changes.
4. Decide whether it participates in external delivery.
5. Document queue behavior if delivery semantics differ from `EventDeliveryItem`.

## Verification

Useful targeted commands:

```powershell
npm test --prefix backend -- calendar.recurrence.spec.ts calendar.processor.spec.ts calendar-delivery.executor.spec.ts event.delivery.service.spec.ts --runInBand
npm test --prefix backend -- calendar-sync-subscription.service.spec.ts calendar-sync.processor.spec.ts --runInBand
npm test --prefix backend -- azure.calendar.controller.spec.ts google.calendar.controller.spec.ts --runInBand
npm run type-check:backend
npm run type-check:frontend
.\node_modules\.bin\vitest.cmd run src\utils\__tests__\eventRecurrence.test.ts
```

Run provider-specific tests when changing payload mapping, credentials, webhook behavior, or external calendar IDs.
