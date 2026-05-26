# Scripts And Script Buttons

Sapling scripts are entity-scoped extension points. They can run as generic lifecycle hooks on the server or as named actions from the frontend context menu.

## Main Files

```text
backend/src/entity/ScriptButtonItem.ts
backend/src/api/script/script.controller.ts
backend/src/api/script/script.service.ts
backend/src/script/core/script.class.ts
backend/src/script/core/script.interface.ts
backend/src/script/core/script.result.client.ts
backend/src/script/core/script.result.server.ts
backend/src/script/*Controller.ts
frontend/src/services/api.script.service.ts
frontend/src/composables/context/useSaplingContextMenuTable.ts
backend/src/database/seeder/json-production/scriptButton/
backend/src/database/seeder/json-demonstration/scriptButton/
```

## Script Button Model

`ScriptButtonItem` defines a visible action for one entity.

| Field | Meaning |
| --- | --- |
| `name` | Technical action name passed to the entity script |
| `title` | Visible button/menu label |
| `parameter` | Optional JSON payload passed to the script |
| `isMultiSelect` | Allows the action to run on multiple selected rows |
| `entity` | Target `EntityItem` |

Script buttons are loaded like normal generic data and displayed in table and calendar context menus. The frontend sends the selected records, entity metadata, button `name`, and optional `parameter` to `POST /api/script/runClient`.

## Dynamic Script Loading

`ScriptService` resolves entity scripts by convention:

```text
entity handle: ticket
controller:    backend/src/script/TicketController.ts
class:         TicketController
```

The loader capitalizes the entity handle and imports `../../script/${NormalizedHandle}Controller.js`. Missing controllers are cached as unavailable and skipped.

Every entity script extends `ScriptClass`. The base class provides:

- `entity`: current `EntityItem`
- `user`: current `PersonItem`
- `em`: MikroORM `EntityManager`
- optional services for Azure/Google calendar, mail, webhooks, event delivery, and Teams
- default no-op implementations for all lifecycle methods
- structured logging helpers

## Client Actions

Client actions are named operations on the entity script's `execute(items, name, parameter)` method.

`ScriptResultClient` supports these result methods:

| Method | Meaning |
| --- | --- |
| `none` | No client-side follow-up |
| `showMessage` | Show a frontend message |
| `callURL` | Ask the client to open/call a URL |
| `setItemData` | Return changed item data to the client |

The frontend type lives in `frontend/src/services/api.script.service.ts`. Keep backend and frontend result contracts aligned when adding a method.

## Server Lifecycle Hooks

Server scripts can run around generic entity operations.

Supported lifecycle methods:

```text
beforeRead
afterRead
beforeUpdate
afterUpdate
beforeInsert
afterInsert
beforeDelete
afterDelete
addReference
deleteReference
```

`ScriptResultServer` supports these result methods:

| Method | Meaning |
| --- | --- |
| `none` | Continue with unchanged items |
| `overwrite` | Continue with script-returned item data |
| `cancel` | Cancel the operation |

Server hooks are invoked by the generic backend flow and can also trigger subscription systems. For methods after read operations, `ScriptService.runServer()` schedules webhook subscriptions and executes Teams and inbox subscriptions.

## Permissions

Both script endpoints require `SessionOrBearerAuthGuard`.

`runClient` requires read permission on the target entity.

`runServer` maps lifecycle methods to permissions:

| Method group | Permission |
| --- | --- |
| Read hooks | `allowRead` |
| Insert hooks | `allowInsert` |
| Update hooks | `allowUpdate` |
| Delete hooks | `allowDelete` |
| Reference add/delete | `allowUpdate` |

Do not use scripts as a permission bypass. A script that reads or mutates other entities should still use services and filters that respect the current user's scope.

## Adding A Script Button

1. Add a `ScriptButtonItem` seed in a new numbered file when it should ship with Sapling.
2. Set `entity` to the target entity handle.
3. Choose a stable technical `name`.
4. Add or update `backend/src/script/<EntityHandle>Controller.ts`.
5. Implement `execute(items, name, parameter)` and switch on the action name.
6. Return a `ScriptResultClient` with the narrowest useful client action.
7. Add translations and permissions if the new button entity data is user-visible.
8. Add a focused script controller test.

## Adding A Server Hook

1. Add or update the entity script controller.
2. Override only the lifecycle method needed for the behavior.
3. Preserve item arrays and return `new ScriptResultServer(items)` unless the hook intentionally changes or cancels data.
4. Avoid slow external calls in blocking hooks. Use subscriptions or delivery queues when possible.
5. Add tests for permission-sensitive or mutation-sensitive hooks.

## Verification

Useful targeted commands:

```powershell
npm test --prefix backend -- script.service.spec.ts --runInBand
npm test --prefix backend -- TicketController.spec.ts --runInBand
npm run type-check:backend
npm run type-check:frontend
```

Run the specific `backend/src/script/*Controller.spec.ts` file for the entity script you changed.
