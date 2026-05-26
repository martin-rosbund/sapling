# Mail And Teams Communication

Sapling communication is built around message templates, rendered entity context, persisted delivery records, and provider-specific dispatch. Email can be manually previewed and sent from the UI; Teams messages are subscription-driven lifecycle notifications.

## Main Files

```text
backend/src/api/mail/mail.controller.ts
backend/src/api/mail/mail.service.ts
backend/src/api/mail/mail.processor.ts
backend/src/api/mail/dto/mail.dto.ts
backend/src/api/mail/markdown.util.ts
backend/src/api/teams/teams.service.ts
backend/src/api/teams/teams.processor.ts
backend/src/api/template/message-template.service.ts
backend/src/entity/EmailTemplateItem.ts
backend/src/entity/EmailDeliveryItem.ts
backend/src/entity/EmailDeliveryStatusItem.ts
backend/src/entity/EMailListItem.ts
backend/src/entity/SharedMailboxItem.ts
backend/src/entity/SharedMailboxGroupItem.ts
backend/src/entity/TeamsTemplateItem.ts
backend/src/entity/TeamsSubscriptionItem.ts
backend/src/entity/TeamsDeliveryItem.ts
backend/src/entity/TeamsDeliveryStatusItem.ts
frontend/src/components/dialog/SaplingDialogMail.vue
frontend/src/components/dialog/mail/
frontend/src/composables/dialog/useSaplingMailDialog.ts
frontend/src/services/api.mail.service.ts
frontend/src/components/dialog/fields/SaplingFieldTeamsRecipient.vue
```

Seed files:

```text
backend/src/database/seeder/json-production/emailTemplate/
backend/src/database/seeder/json-production/emailList/
backend/src/database/seeder/json-production/teamsTemplate/
backend/src/database/seeder/json-production/teamsSubscription/
backend/src/database/seeder/json-production/teamsDeliveryStatus/
backend/src/database/seeder/json-demonstration/emailTemplate/
backend/src/database/seeder/json-demonstration/teamsTemplate/
backend/src/database/seeder/json-demonstration/teamsSubscription/
```

## Shared Template Context

Mail and Teams use `MessageTemplateService`.

Template context can contain:

- the target entity record loaded by `entityHandle` and `itemHandle`
- `currentUser`
- optional draft values from the client
- populated relation paths requested by subscription recipient fields

Placeholders use `{{path.to.value}}` syntax. Date fields can be formatted through formatters such as:

```text
{{startDate|date}}
{{updatedAt|datetime}}
```

Markdown is rendered to HTML by the shared renderer. Mail additionally creates a plain-text representation for MIME messages.

## Email Model

`EmailTemplateItem` defines reusable email content.

| Field | Meaning |
| --- | --- |
| `name` | Template name |
| `description` | Optional explanation |
| `subjectTemplate` | Placeholder-enabled subject |
| `bodyMarkdown` | Placeholder-enabled markdown body |
| `isDefault` | Candidate default template |
| `isActive` | Allows disabling without deleting |
| `entity` | Entity context for the template |

`EmailDeliveryItem` is the persisted dispatch record.

| Field | Meaning |
| --- | --- |
| `status` | Pending, success, failed |
| `template` | Optional source template |
| `entity` | Target entity |
| `createdBy` | Sending user |
| `referenceHandle` | Target record handle as string |
| `provider` | User/provider handle such as `azure` or `google` |
| `toRecipients`, `ccRecipients`, `bccRecipients` | Resolved recipients |
| `subject`, `bodyMarkdown`, `bodyHtml` | Rendered message |
| `attachmentHandles` | Document handles attached to the message |
| `requestPayload` | Provider-independent audit payload |
| `responseStatusCode`, `responseBody`, `responseHeaders` | Provider result |
| `providerMessageId` | External message id when available |
| `attemptCount`, `nextRetryAt`, `completedAt` | Delivery lifecycle fields |

## Email Flow

Manual email sending goes through `MailController`.

| Endpoint | Permission | Purpose |
| --- | --- | --- |
| `GET /api/mail/senders` | Authenticated user | Lists available sender addresses |
| `POST /api/mail/preview` | `allowRead` on `entityHandle` | Resolves recipients, subject, markdown, HTML, and attachments |
| `POST /api/mail/send` | `allowUpdate` on `entityHandle` | Persists and queues/sends an email delivery |

`MailService.sendEmail()` always renders through preview first. It then persists an `EmailDeliveryItem` with pending status. If Redis is enabled, a BullMQ `emails` job is queued. If Redis is disabled, dispatch runs immediately.

Provider dispatch supports:

| Provider | Behavior |
| --- | --- |
| Azure | Sends through Microsoft Graph |
| Google | Sends through Gmail API |

After successful dispatch, Sapling creates a completed `EventItem` of type `mail` as a communication follow-up. Failures are persisted on the delivery record.

## Sender Resolution

Sender options are resolved from the current person:

1. Active user provider from `PersonItem.type`.
2. OAuth session tokens from `PersonSessionItem`.
3. Provider-discovered primary or alias addresses.
4. Configured shared mailboxes assigned through active mailbox groups.
5. Fallback to the user's profile email when provider lookup is not available.

When a sender email is requested explicitly, it must match an available sender option. Otherwise `mail.senderNotAllowed` is raised.

## Teams Model

`TeamsTemplateItem` stores reusable Teams message markdown.

`TeamsSubscriptionItem` decides when a Teams message is created.

| Field | Meaning |
| --- | --- |
| `description` | Human-readable subscription name |
| `recipientField` | Context path resolving a recipient person |
| `isActive` | Enables/disables the subscription |
| `entity` | Entity being observed |
| `type` | Lifecycle event, for example `afterInsert` |
| `template` | Entity-dependent Teams template |

`TeamsDeliveryItem` stores one outgoing Teams message.

| Field | Meaning |
| --- | --- |
| `status` | Pending, success, failed |
| `subscription`, `template`, `entity` | Source configuration |
| `createdBy` | Sender |
| `recipientPerson` | Resolved recipient |
| `referenceHandle` | Source record handle |
| `provider` | Currently `azure` |
| `bodyMarkdown`, `bodyHtml` | Rendered content |
| `requestPayload` | Audit/debug payload |
| `responseStatusCode`, `responseBody` | Provider result |
| `providerMessageId` | Microsoft Graph message id |

## Teams Flow

Teams messages are usually triggered by server scripts. `ScriptService.runSubscription()` loads active `TeamsSubscriptionItem` rows matching the entity and lifecycle type, resolves recipient relations, and calls `TeamsService.querySubscription()`.

`TeamsService` then:

1. Loads the subscription, entity, type, and template.
2. Builds message context for each payload item.
3. Resolves `recipientField` to a `PersonItem`.
4. Renders markdown and HTML.
5. Persists a delivery as pending or failed.
6. Queues `deliver-teams-message` when Redis is enabled or dispatches immediately otherwise.
7. Sends through Microsoft Graph using the current user's Azure session.

Teams delivery requires:

- sender has provider type `azure`
- sender has a usable Azure session/access token or refresh token
- recipient has provider type `azure`
- recipient has a `loginName`

Self messages use the Microsoft Teams self-chat id `48:notes`; other messages use a one-on-one chat.

## Extension Checklist

When adding a new mail template:

1. Add a new numbered seed file in the right `emailTemplate` folder.
2. Set `entity` to the entity whose record supplies placeholders.
3. Keep subject short and body markdown readable without HTML.
4. Use `{{currentUser...}}` and entity paths intentionally.
5. Preview in the UI before relying on send behavior.

When adding a new Teams subscription:

1. Add or reuse a `TeamsTemplateItem` for the entity.
2. Add a `TeamsSubscriptionItem` with `entity`, lifecycle `type`, `recipientField`, and `template`.
3. Make sure the recipient path can resolve to a person handle or person object.
4. Confirm server lifecycle hooks run for the entity operation.
5. Verify sender and recipient Azure prerequisites.

## Verification

Useful targeted commands:

```powershell
npm test --prefix backend -- mail.service.spec.ts teams.service.spec.ts --runInBand
npm test --prefix backend -- TeamsDeliveryController.spec.ts EmailDeliveryController.spec.ts --runInBand
npm run type-check:backend
npm run type-check:frontend
.\node_modules\.bin\vitest.cmd run src\components\dialog\mail\SaplingDialogMailComposer.spec.ts
.\node_modules\.bin\vitest.cmd run src\components\dialog\fields\__tests__\SaplingFieldTeamsRecipient.test.ts
```

Run provider-specific manual checks for real Azure/Google/Teams dispatch because local tests should not depend on external provider availability.
