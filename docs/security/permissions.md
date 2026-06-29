# Permissions And Roles

Sapling combines authentication, role membership, entity capability flags, and per-role entity permissions.

## Main Files

```text
backend/src/auth/
backend/src/auth/guard/session-or-token-auth.guard.ts
backend/src/auth/guard/generic-permission.guard.ts
backend/src/auth/guard/admin-permission.guard.ts
backend/src/auth/guard/impersonation-read-only.guard.ts
backend/src/entity/RoleItem.ts
backend/src/entity/PermissionItem.ts
backend/src/entity/EntityItem.ts
backend/src/database/seeder/PermissionSeeder.ts
backend/src/database/seeder/permission-matrices.ts
frontend/src/stores/currentPermissionStore.ts
frontend/src/utils/entityAccess.ts
```

## Authentication

Most API routes use:

```text
SessionOrBearerAuthGuard
```

Supported modes:

- existing Sapling session (`req.user` already set)
- bearer token in `Authorization: Bearer <token>`

Bearer tokens are validated through `AuthService.validateApiToken`.

Public exceptions:

- `GET /api/system/state`
- public reads for `translation`, `entity`, and `entityGroup`

## Entity Capability Flags

`EntityItem` defines high-level capabilities:

```text
canRead
canInsert
canUpdate
canDelete
canShow
```

These describe what the entity supports globally. Role permissions then decide who receives those capabilities.

## PermissionItem

`PermissionItem` connects one role to one entity.

Permission flags:

```text
allowRead
allowInsert
allowUpdate
allowDelete
allowShow
```

Generic API method mapping:

| HTTP method | Permission |
| --- | --- |
| `GET` | `allowRead` |
| `POST` | `allowInsert` |
| `PATCH` | `allowUpdate` |
| `DELETE` | `allowDelete` |

`allowShow` controls whether the entity should appear in navigation/UI contexts.

## GenericPermissionGuard

File:

```text
backend/src/auth/guard/generic-permission.guard.ts
```

It checks:

1. authenticated user exists
2. target entity handle is known from route/decorator/resolver
3. requested permission is resolved
4. at least one user role has that permission for the entity

Routes can override the default method mapping with `@GenericPermission(...)`.

Some public read entities bypass this check for `GET`:

```text
translation
entity
entityGroup
```

Event privacy is enforced after the normal entity permission check. `event` records with `isPrivate = true` are visible only to the record's `creatorPerson`, including users whose role grants global Event read permission. This protects private Outlook imports across generic lists, exports, relation/reference checks, KPIs using generic filters, MCP generic reads, timelines, and direct update/delete operations.

## Permission Seeder

File:

```text
backend/src/database/seeder/PermissionSeeder.ts
```

Permission matrices:

```text
backend/src/database/seeder/permission-matrices.ts
```

The seeder creates missing permissions for every entity/role combination. It does not update existing permissions.

Known role handles live in:

```text
backend/src/database/seeder/role-handles.ts
```

Admin role behavior:

- reads all entities
- inherits insert/update/delete/show from entity capability flags

Other known roles use permission matrices.

Unknown roles default to deny all.

## Frontend Permission Usage

Frontend permissions are loaded from current-user/current-metadata endpoints.

Important files:

```text
frontend/src/stores/currentPersonStore.ts
frontend/src/stores/currentPermissionStore.ts
frontend/src/utils/entityAccess.ts
frontend/src/components/permission/
```

Frontend checks are for UX only. Backend guards remain authoritative.

## Provider User Import

The permission management page can import Azure or Google directory users into Sapling persons.

Backend endpoints:

```text
GET /api/auth/provider-users?provider=azure|google&search=&pageToken=
POST /api/auth/provider-users/import
```

These endpoints require an authenticated administrator. The current administrator must be signed in with the same provider being imported because Sapling uses that user's `PersonSessionItem` access or refresh token to query Microsoft Graph or Google Workspace Admin SDK. Imported people are active by default, receive the selected roles, can optionally be assigned to a selected company, and do not receive provider tokens until they sign in themselves.

## MCP And Service Accounts

Internal MCP tools run with the authenticated Sapling user.

Implications:

- A product integration should use a dedicated Sapling service user.
- Assign only the roles needed by that product.
- Generic MCP tools cannot bypass entity permissions.
- Semantic search filters vector results through generic record loading, so users only receive records they can read.
- Private Event records remain owner-only when accessed through generic MCP tools because those tools use the same generic read filters.

See:

```text
docs/integrations/sapling-mcp-http.md
docs/ai/ai-mcp-vectorization.md
```

## Adding Permissions For A New Entity

1. Add the entity seed entry with correct capability flags.
2. Register the entity in `ENTITY_REGISTRY`.
3. Add or adjust permission matrices if known roles should access it.
4. Run seeders on a test database.
5. Verify the entity appears or stays hidden as expected.

## Common Mistakes

- Granting frontend visibility without backend read permission.
- Adding an entity but forgetting permission matrices.
- Expecting `PermissionSeeder` to update already-existing permissions.
- Giving external products admin roles instead of purpose-specific service roles.
- Treating `allowShow` as a backend read grant. It is not; `allowRead` is still required.
