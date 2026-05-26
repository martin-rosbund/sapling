# Entity And Metadata System

Sapling's central architecture is a metadata-driven entity system. Entities describe persistence, permissions, form layout, field behavior, references, and generic UI behavior.

## Core Flow

```text
MikroORM entity
  -> ENTITY_REGISTRY handle
  -> TemplateService metadata
  -> GenericController / GenericService
  -> Frontend table, dialog, references, filters
```

Important files:

```text
backend/src/entity/*Item.ts
backend/src/entity/global/entity.registry.ts
backend/src/entity/global/entity.decorator.ts
backend/src/api/template/template.service.ts
backend/src/api/template/dto/entity-template.dto.ts
backend/src/api/generic/
frontend/src/entity/structure.ts
frontend/src/components/dialog/SaplingDialogEditFieldRenderer.vue
frontend/src/composables/table/
```

## Entity Handles

An entity handle is the stable string name for an entity.

Examples:

```text
ticket
event
salesOpportunity
effortEstimate
person
company
translation
```

The handle is used in:

- `ENTITY_REGISTRY`
- seed folder names
- generic API URLs
- permissions
- translations
- frontend routes
- MCP generic tools
- vectorization entity handles when supported

Changing a handle is a breaking cross-layer change.

## ENTITY_REGISTRY

`backend/src/entity/global/entity.registry.ts` registers entity handles.

It exports:

- `ENTITY_REGISTRY`: sorted registry entries.
- `ENTITY_HANDLES`: list of handles.
- `ENTITY_MAP`: map from handle to entity class.

When adding a new entity, register it here or the generic API/template system will not know it exists.

## Sapling Decorators

Sapling decorators live in:

```text
backend/src/entity/global/entity.decorator.ts
```

They attach metadata to entity properties through `reflect-metadata`. `TemplateService` reads that metadata and sends it to the frontend as `EntityTemplateDto`.

### `@Sapling([...])`

Describes field semantics.

Common options:

| Option | Meaning |
| --- | --- |
| `isValue` | Primary human-readable value for lists/references |
| `isSecurity` | Sensitive field; omitted from MCP schemas and handled as protected UI |
| `isReadOnly` | Display-only/system-controlled field |
| `isSystem` | System metadata such as timestamps |
| `isMarkdown` | Markdown editor/preview field |
| `isLink` | Link field |
| `isMail` | Email field |
| `isPhone` | Phone field |
| `isColor` | Color picker |
| `isIcon` | Icon selector |
| `isChip` | Chip-like status/type display |
| `isMoney` | Money input |
| `isPercent` | Percent input |
| `isNumeric` | Plain numeric input with step controls |
| `isDuplicateCheck` | Duplicate check during create |
| `isCompany` | Company reference semantics |
| `isPerson` | Person reference semantics |
| `isCurrentPerson` | Current-user default/filter behavior |
| `isCurrentCompany` | Current-company default/filter behavior |
| `isOrderASC` / `isOrderDESC` | Preferred ordering field |
| `isDeadline` / `isToday` | Date semantics for work filters |
| `isDateStart` / `isDateEnd` | Start/end date pairing |
| `isAutoKey` | Auto-key editor |

### `@SaplingForm(...)`

Controls generated edit dialog layout.

Example:

```ts
@SaplingForm({
  order: 100,
  group: 'ticket.groupBasics',
  groupOrder: 100,
  width: 2,
})
```

Fields are sorted by group order and field order. Width is a 1-4 grid span.

### `@SaplingDependsOn(...)`

Defines dependent reference filtering.

Common pattern:

```ts
@SaplingDependsOn({
  parentField: 'company',
  targetField: 'company',
  requireParent: true,
  clearOnParentChange: true,
})
```

The frontend uses this metadata to filter a child relation by the selected parent relation.

### `@SaplingGenericReference(...)`

Models polymorphic references with an entity field and a handle field.

Use when one record can point to different entity types.

### `@SaplingReferenceTemplate(...)`

Copies values from a selected reference/template into the current record.

Example use case:

- `EffortEstimatePositionItem.template`
- copies `offerTextMarkdown`
- optionally copies `estimatedHours`

## TemplateService

`backend/src/api/template/template.service.ts` reads MikroORM metadata and Sapling decorator metadata.

It returns `EntityTemplateDto[]` with:

- field name and type
- relation kind and reference target
- primary key/autoincrement flags
- nullable/required/default values
- Sapling options
- form layout
- dependency metadata
- generic reference metadata
- reference template metadata

The frontend should rely on template metadata instead of duplicating backend rules.

## Frontend Field Rendering

`frontend/src/components/dialog/SaplingDialogEditFieldRenderer.vue` selects field components from template metadata.

Examples:

| Template signal | Renderer |
| --- | --- |
| `genericReference` | `SaplingFieldGenericReference` |
| relation field | `SaplingSingleSelectField` |
| `isPhone` | `SaplingPhoneField` |
| `isMail` | `SaplingMailField` |
| `isLink` | `SaplingLinkField` |
| `isColor` | `SaplingColorField` |
| `isIcon` | `SaplingIconField` |
| `isPercent` | `SaplingFieldPercent` |
| `isMoney` | `SaplingFieldMoney` |
| `isNumeric` or numeric type | `SaplingNumberField` |
| `boolean` | `SaplingBooleanField` |
| `datetime` | `SaplingDateTimeField` |
| `DateType` | `SaplingDateTypeField` |
| `isMarkdown` | `SaplingMarkdownField` |
| `JsonType` | `SaplingJsonField` |
| `isSecurity` | `SaplingPasswordField` |
| short strings | `SaplingShortTextField` |
| fallback | `SaplingLongTextField` |

## Adding A New Entity Checklist

Backend:

1. Create `backend/src/entity/NewThingItem.ts`.
2. Add MikroORM decorators and Sapling metadata.
3. Register in `ENTITY_REGISTRY`.
4. Add migration.
5. Add seed files:
   - `entityData_XXX.json`
   - `entityRouteData_XXX.json`
   - `translationData_XXX.json`
   - entity-specific reference/demo files
6. Update permission matrices if access should differ from defaults.
7. Add script-button controller only if entity-specific actions are needed.

Frontend:

1. Use generic table route if possible.
2. Add custom field renderer only for a new Sapling option or special entity field.
3. Add custom view only for workflows that cannot be expressed generically.
4. Ensure translations are loaded by the relevant view/composable.

AI/MCP:

1. Entity is automatically available to generic MCP tools if registered and permitted.
2. Add semantic vectorization only if long-text semantic search is valuable.
3. Update AI docs/tool guidance when adding new AI-visible behavior.

## Common Mistakes

- Adding an entity class but not registering it.
- Adding a route but forgetting navigation/entity seed data.
- Editing old seed files when a new numbered seed file is expected.
- Adding frontend-only field behavior instead of using Sapling metadata.
- Forgetting that permissions are role/entity based and can block generic API and MCP tools.
