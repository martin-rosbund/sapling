# Inbox And Open Task Notifications

Sapling's inbox is a data-driven notification system. It creates persistent inbox notifications from entity events and template/subscription configuration, then pushes open-task refresh events to connected users.

## Main Files

```text
backend/src/entity/InboxTemplateItem.ts
backend/src/entity/InboxSubscriptionItem.ts
backend/src/entity/InboxNotificationItem.ts
backend/src/api/inbox/inbox.service.ts
backend/src/api/inbox/inbox.module.ts
backend/src/api/current/open-task-events.service.ts
backend/src/api/current/current.service.ts
backend/src/api/current/current.controller.ts
frontend/src/components/account/SaplingInbox.vue
frontend/src/components/account/inbox/
frontend/src/components/system/header/SaplingHeaderInboxPreview.vue
frontend/src/composables/account/useSaplingInbox.ts
frontend/src/composables/system/useOpenTaskCountEvents.ts
frontend/src/utils/inboxRoute.util.ts
```

Seed files:

```text
backend/src/database/seeder/json-production/inboxTemplate/
backend/src/database/seeder/json-production/inboxSubscription/
backend/src/database/seeder/json-demonstration/inboxTemplate/
backend/src/database/seeder/json-demonstration/inboxSubscription/
```

## Data Model

### InboxTemplateItem

Defines message content for one entity.

Important fields:

| Field | Meaning |
| --- | --- |
| `name` | Human-readable template name |
| `titleTemplate` | Placeholder-enabled notification title |
| `bodyMarkdown` | Placeholder-enabled markdown body |
| `isDefault` | Marks default template candidates |
| `isActive` | Allows disabling without deleting |
| `entity` | Entity the template belongs to |

### InboxSubscriptionItem

Defines when and for whom notifications are created.

Important fields:

| Field | Meaning |
| --- | --- |
| `description` | Human-readable subscription name |
| `recipientField` | Context path that resolves recipient person(s) |
| `isActive` | Enables/disables the subscription |
| `entity` | Entity being watched |
| `type` | Event type, e.g. `afterInsert`, `afterUpdate`, `afterDelete` |
| `template` | Template used for generated notifications |

`template` depends on `entity`, so the frontend filters template choices by selected entity.

### InboxNotificationItem

Persistent notification instance.

Important fields:

| Field | Meaning |
| --- | --- |
| `entity` | Referenced entity type |
| `subscription` | Subscription that created it |
| `template` | Template used at creation time |
| `recipientPerson` | Person who receives the notification |
| `createdBy` | User who triggered the event |
| `referenceHandle` | Record handle of the source entity |
| `title` | Rendered title |
| `bodyMarkdown` | Rendered markdown body |
| `bodyText` | Plain-text body for previews/search |
| `requestPayload` | Diagnostic creation payload |
| `isRead` / `readAt` | Read state |

`referenceHandle` uses `@SaplingGenericReference` together with `entity`, so the UI can navigate back to the referenced record.

## Notification Creation Flow

`InboxService.querySubscription(...)` is the main entry point.

Flow:

1. Load active `InboxSubscriptionItem` with entity, type, and template.
2. Validate entity and template.
3. Normalize payload to one or more source items.
4. For each item, load entity context through `MessageTemplateService`.
5. Resolve recipients from `recipientField`.
6. Render `titleTemplate` and `bodyMarkdown`.
7. Strip markdown into `bodyText`.
8. Create `InboxNotificationItem` rows.
9. Flush changes.
10. Notify affected users through `OpenTaskEventsService`.

For delete subscriptions, the payload itself is used as context because the source record may no longer exist.

## Placeholder Context

Inbox templates use the same placeholder engine as message templates.

The context contains:

```text
currentUser
source record fields
loaded relation fields
```

Examples:

```text
{{ title }}
{{ status.description }}
{{ assigneePerson.firstName }}
{{ expectedCompletionDate }}
{{ currentUser.firstName }}
```

The relation expressions passed to `querySubscription` control which nested values are available.

## Recipient Resolution

`recipientField` is a path into the template context.

It may resolve to:

- a numeric person handle
- a string numeric handle
- an object with `handle`
- an array of any of the above

Examples:

```text
assigneePerson
creatorPerson
participants
```

If no person handles are found, no notification is created.

## Open Task Events

`OpenTaskEventsService` provides in-memory user-specific refresh notifications.

Behavior:

- clients subscribe per user handle
- subscription immediately emits once
- inbox creation/read changes notify affected users
- listeners are removed when the observable unsubscribes

This is a refresh signal, not the notification payload itself. Clients reload current inbox/open-task state after receiving it.

## Frontend Behavior

The inbox UI is split into:

```text
frontend/src/components/account/SaplingInbox.vue
frontend/src/components/account/inbox/SaplingInboxSummaryCard.vue
frontend/src/components/account/inbox/SaplingInboxSection.vue
frontend/src/components/account/inbox/SaplingInboxEntryCard.vue
frontend/src/components/system/header/SaplingHeaderInboxPreview.vue
frontend/src/composables/account/useSaplingInbox.ts
```

Navigation from a notification is built through `frontend/src/utils/inboxRoute.util.ts`, using `entity` and `referenceHandle`.

## Adding A New Entity To Inbox

1. Ensure the entity has a useful recipient relation such as `assigneePerson`, `creatorPerson`, or a participants collection.
2. Add an inbox template seed file in both production and demonstration when relevant.
3. Add an inbox subscription seed file in both production and demonstration.
4. Include relation expressions wherever notifications are triggered so placeholders can resolve needed fields.
5. Ensure frontend inbox route logic can navigate to the entity route.
6. Verify permissions allow recipients to open the referenced record.
7. Test with a realistic record in the demonstration seed data.

Recommended seed naming:

```text
inboxTemplate/inboxTemplateData_XXX.json
inboxSubscription/inboxSubscriptionData_XXX.json
```

## Common Mistakes

- Using a `recipientField` that resolves to a company instead of a person.
- Forgetting relation expressions needed by template placeholders.
- Creating templates for an entity but no active subscription.
- Creating notifications for users who cannot read the referenced record.
- Assuming open-task events contain data; they only signal that the client should refresh.
