# Webhook System

Sapling webhooks deliver entity lifecycle payloads to external HTTP endpoints. A webhook subscription defines the target, payload shape, relations, HTTP method, signing, and authentication; a webhook delivery records each outbound attempt.

## Main Files

```text
backend/src/entity/WebhookSubscriptionItem.ts
backend/src/entity/WebhookDeliveryItem.ts
backend/src/entity/WebhookDeliveryStatusItem.ts
backend/src/entity/WebhookSubscriptionTypeItem.ts
backend/src/entity/WebhookSubscriptionPayloadType.ts
backend/src/entity/WebhookSubscriptionMethodItem.ts
backend/src/entity/WebhookAuthenticationTypeItem.ts
backend/src/entity/WebhookAuthenticationApiKeyItem.ts
backend/src/entity/WebhookAuthenticationBasicItem.ts
backend/src/entity/WebhookAuthenticationOAuth2Item.ts
backend/src/api/webhook/webhook.controller.ts
backend/src/api/webhook/webhook.service.ts
backend/src/api/webhook/webhook-delivery.executor.ts
backend/src/api/webhook/webhook.processor.ts
backend/src/script/core/script.service.ts
```

Seed files:

```text
backend/src/database/seeder/json-production/webhookSubscriptionType/
backend/src/database/seeder/json-production/webhookSubscriptionPayloadType/
backend/src/database/seeder/json-production/webhookSubscriptionMethod/
backend/src/database/seeder/json-production/webhookAuthenticationType/
backend/src/database/seeder/json-production/webhookDeliveryStatus/
backend/src/database/seeder/json-production/webhookSubscription/
```

## Subscription Model

`WebhookSubscriptionItem` defines one outbound integration.

| Field | Meaning |
| --- | --- |
| `description` | Visible subscription name |
| `url` | Target URL; may include `{{field}}` replacement for item payloads |
| `customHeaders` | Optional additional request headers |
| `containerName` | Optional wrapper property; payload is JSON-stringified into this property |
| `relations` | Optional relation population list before sanitizing payload |
| `payloadType` | Payload shape, commonly `list` or `item` |
| `isActive` | Enables/disables the subscription |
| `signingSecret` | HMAC secret for `X-Webhook-Signature` |
| `entity` | Entity being observed |
| `type` | Lifecycle event such as `afterInsert`, `afterUpdate`, `afterDelete` |
| `method` | HTTP method: `post`, `put`, `patch`, `delete` |
| `authenticationType` | `none`, `apikey`, `oauth2`, or `basic` |

`relations` supports:

- `*` for all references
- relation kinds such as `1:m`, `m:1`, `m:n`, `n:m`
- named relation paths such as `company` or `assigneePerson.company`

## Delivery Model

`WebhookDeliveryItem` stores one outbound attempt chain.

| Field | Meaning |
| --- | --- |
| `status` | Pending, success, failed |
| `subscription` | Source subscription |
| `payload` | Prepared and sanitized payload |
| `requestHeaders` | Headers sent to the endpoint |
| `responseStatusCode` | Last response status |
| `responseBody` | Last response body |
| `responseHeaders` | Last response headers |
| `completedAt` | Completion timestamp |
| `attemptCount` | Number of attempts |
| `nextRetryAt` | Optional retry scheduling hint |

## Trigger Flow

Webhooks are normally triggered by server lifecycle scripts. `ScriptService.runServer()` schedules webhook subscriptions for methods after read operations.

Manual trigger endpoint:

```text
POST /api/webhooks/trigger/:handle
```

Manual retry endpoint:

```text
POST /api/webhooks/retry/:handle
```

Both endpoints require session or bearer auth and update permission on the subscription's target entity.

Execution flow:

1. `WebhookService.querySubscription()` loads the active subscription.
2. Payload relations are populated or reloaded when configured.
3. Security fields marked with `@Sapling(['isSecurity'])` are removed.
4. A pending `WebhookDeliveryItem` is persisted.
5. Redis enabled: BullMQ `webhooks` queue gets `deliver-webhook`.
6. Redis disabled: `WebhookDeliveryExecutor.execute()` runs immediately.
7. Executor resolves auth headers, signing, method, URL, and payload wrapping.
8. Success/failure response metadata is persisted.

## Payload Sanitizing

`WebhookService.preparePayload()` uses entity template metadata to:

- populate configured relations
- reload plain payloads from the database when possible
- avoid populating deleted records for `afterDelete`
- remove fields marked as security fields
- protect circular references by returning handle-only fallbacks

This is important: webhook payloads should not expose password hashes, token hashes, secrets, or hidden security configuration.

## Signing

Every outbound webhook includes:

```text
X-Webhook-Event: <subscription.type.handle>
X-Webhook-Signature: <hmac-sha256>
```

The signature is computed over `JSON.stringify(delivery.payload)` using `subscription.signingSecret` or an empty string when no secret is configured.

Prefer configuring a non-empty signing secret for production integrations.

## Authentication

Supported outbound authentication types:

| Type | Header behavior |
| --- | --- |
| `none` | No auth header |
| `apikey` | Uses configured header name, defaulting to `X-Api-Key` |
| `basic` | Sends `Authorization: Basic <base64(username:password)>` |
| `oauth2` | Client credentials grant; sends `Authorization: Bearer <token>` |

OAuth2 tokens are cached on `WebhookAuthenticationOAuth2Item` until `tokenExpiresAt`. The executor refreshes when the cached token is missing or expired.

## HTTP Method Behavior

| Method | Behavior |
| --- | --- |
| `post` | Sends payload as JSON body |
| `put` | Sends payload as JSON body |
| `patch` | Sends payload as JSON body |
| `delete` | Converts payload object fields into query parameters |

For `payloadType = item`, when the delivery payload is an array, the executor uses the first item and can replace `{{field}}` placeholders in the URL with base64-encoded field values.

## Extension Checklist

When adding a webhook subscription:

1. Choose the target entity and lifecycle `type`.
2. Keep `relations` as small as possible.
3. Configure `payloadType` to match the receiving system.
4. Use a signing secret in production.
5. Choose the least powerful authentication method that works.
6. Test with Redis enabled and disabled if queue behavior matters.
7. Verify the delivery payload does not contain security fields.

When extending webhook behavior:

1. Update `WebhookSubscriptionItem` or related reference entities if the configuration changes.
2. Add migrations for schema changes.
3. Add numbered seed files for new reference handles.
4. Update `WebhookDeliveryExecutor` for new auth/method/payload behavior.
5. Add executor/service tests for success and failure paths.

## Verification

Useful commands:

```powershell
npm test --prefix backend -- webhook.service.spec.ts webhook-delivery.executor.spec.ts webhook.processor.spec.ts --runInBand
npm test --prefix backend -- generic-permission.guard.spec.ts --runInBand
npm run type-check:backend
```

For production integrations, also test against a controlled receiver that verifies headers, signature, payload shape, and retry behavior.
