# Authentication, Sessions, And Providers

Sapling supports session authentication for the browser, bearer-token authentication for API consumers, local username/password login, Azure and Google OAuth login, provider sessions for external integrations, and administrator impersonation.

## Main Files

```text
backend/src/auth/auth.controller.ts
backend/src/auth/auth.service.ts
backend/src/auth/local/local.strategy.ts
backend/src/auth/azure/azure.strategy.ts
backend/src/auth/google/google.strategy.ts
backend/src/auth/guard/session-or-token-auth.guard.ts
backend/src/auth/guard/generic-permission.guard.ts
backend/src/auth/guard/admin-permission.guard.ts
backend/src/session/session.serializer.ts
backend/src/session/session.config.ts
backend/src/entity/PersonItem.ts
backend/src/entity/PersonSessionItem.ts
backend/src/entity/PersonApiTokenItem.ts
frontend/src/stores/authStore.ts
frontend/src/stores/currentPersonStore.ts
frontend/src/router/index.ts
frontend/src/components/account/SaplingLogin.vue
```

## Authentication Modes

| Mode | Purpose |
| --- | --- |
| Local session | Browser login with username/password |
| Azure session | Browser OAuth login and provider tokens for Microsoft Graph |
| Google session | Browser OAuth login and provider tokens for Google APIs |
| Bearer API token | API access for automations, MCP, and integrations |
| Impersonation | Administrator "view as user" support |

Most protected backend endpoints use `SessionOrBearerAuthGuard`, so the same endpoint can work for browser sessions and API clients.

## Session Login

Local login:

```text
POST /api/auth/local/login
```

Azure login:

```text
GET /api/auth/azure/login
GET /api/auth/azure/callback
```

Google login:

```text
GET /api/auth/google/login
GET /api/auth/google/callback
```

Logout:

```text
POST /api/auth/logout
```

Auth check:

```text
GET /api/auth/isAuthenticated
```

`AuthController.completeLogin()` regenerates the session before logging in the user. Local login sets session max age based on `rememberMe`.

## Person And Provider Sessions

`PersonItem` contains the core account fields:

- `loginName`
- `loginPassword`
- `requirePasswordChange`
- `isActive`
- `type`
- roles and permissions
- optional `session`

`PersonSessionItem` stores provider access and refresh tokens for Azure/Google integrations. Mail, Teams, and calendar services use these tokens for provider APIs and refresh them when possible.

`AuthService.saveNewLogin()` creates or updates the person and session after Azure/Google OAuth login:

1. Find person by provider profile handle/login name.
2. Create person if missing and a matching `PersonTypeItem` exists.
3. Create or update `PersonSessionItem` with access and refresh tokens.
4. Return the current-user profile.

## Bearer API Tokens

`PersonApiTokenItem` stores inbound API tokens.

| Field | Meaning |
| --- | --- |
| `description` | Human-readable token label |
| `tokenPrefix` | Visible prefix for identification |
| `rawToken` | Non-persisted one-time secret before hashing |
| `tokenHash` | Persisted SHA-256 hash with `sha256$` prefix |
| `isActive` | Allows deactivation without deleting |
| `expiresAt` | Expiration timestamp |
| `lastUsedAt` | Last successful use |
| `allowedIps` | Optional exact-match IP allowlist |
| `person` | Token owner |

Token endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/auth/token` | List token metadata |
| `POST /api/auth/token` | Create token and return one-time secret |
| `POST /api/auth/token/:handle/rotate` | Deactivate old token and return replacement secret |
| `DELETE /api/auth/token/:handle` | Deactivate token |

Managing another person's tokens requires global-stage permission on `personApiToken` for the requested action.

Bearer validation:

1. Hash incoming token.
2. Find active token with matching hash.
3. Reject expired tokens.
4. Load active owner as the request user.
5. Enforce `allowedIps` when configured.
6. Update `lastUsedAt`.

## Session Or Bearer Guard

`SessionOrBearerAuthGuard` allows:

- public `GET /api/system/state`
- public generic reads for `translation`, `entity`, and `entityGroup`
- existing session user
- valid `Authorization: Bearer <token>` header

Invalid or missing credentials throw `UnauthorizedException`.

## Impersonation

Administrator impersonation is session-based.

Start:

```text
POST /api/auth/impersonate/:handle
```

Stop:

```text
POST /api/auth/impersonate/stop
```

Rules:

- only administrators can start impersonation
- nested impersonation is rejected
- users cannot impersonate themselves
- inactive targets are rejected
- the session keeps the real admin handle and adds `impersonatedHandle`
- `SessionSerializer` deserializes the target user only if the real user is still an administrator
- current user responses include `_impersonator` so the frontend can show the return action

The frontend hard-reloads after start/stop to rebuild stores, SSE connections, route guards, and cached permissions under the correct identity.

## Frontend Routing

The frontend router calls `authStore.validate()` before protected routes. It then loads the current person.

Routing outcomes:

| State | Route behavior |
| --- | --- |
| unauthenticated | redirect to `login` |
| authenticated without assigned roles | redirect to access pending |
| authenticated with roles | allow app route |

`currentPersonStore` owns current profile loading and impersonation start/stop actions.

## Security Notes

- Never expose `loginPassword`, token hashes, refresh tokens, or webhook secrets in APIs or webhook payloads.
- API token secrets are returned only once when created or rotated.
- Use short expirations and IP allowlists for automation tokens where possible.
- Provider refresh tokens are high-value secrets because they enable mail, Teams, and calendar actions.
- Bearer tokens act as the owning person and still go through generic permissions.

## Verification

Useful commands:

```powershell
npm test --prefix backend -- session.serializer.spec.ts generic-permission.guard.spec.ts --runInBand
npm test --prefix backend -- encrypted-string.spec.ts request-origin-protection.spec.ts --runInBand
npm run type-check:backend
npm run type-check:frontend
```

Also verify login, logout, token creation/rotation/deactivation, and impersonation in a browser against a test database.
