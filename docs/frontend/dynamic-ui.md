# Frontend Dynamic UI

Sapling's frontend renders much of the application from backend entity metadata. This allows new entities to appear in generic tables and dialogs without building one custom screen per entity.

## Main Files

```text
frontend/src/router/index.ts
frontend/src/views/TableView.vue
frontend/src/views/PartnerView.vue
frontend/src/views/FileView.vue
frontend/src/stores/genericStore.ts
frontend/src/stores/translationStore.ts
frontend/src/services/api.generic.service.ts
frontend/src/services/translation.service.ts
frontend/src/components/dialog/
frontend/src/components/dialog/SaplingDialogEditFieldRenderer.vue
frontend/src/composables/table/
frontend/src/composables/generic/
```

## Dynamic Routes

The router defines generic entity routes:

```text
/table/:entity
/partner/:entity
/file/:entity
```

These routes use the entity handle from the URL and load data/templates/translations dynamically.

Specialized views exist for workflows that are not pure CRUD:

```text
/event
/note
/permission
/form-config
/system
/playground
```

## Data Sources

The dynamic UI depends on:

- generic records from `/api/generic/:entityHandle`
- entity templates from `/api/template/:entityHandle`
- translations from translation endpoints/store
- current user and permission metadata
- entity/navigation seed data

## Generic Store And Services

Important files:

```text
frontend/src/services/api.generic.service.ts
frontend/src/stores/genericStore.ts
frontend/src/services/api.service.ts
frontend/src/services/api.error.service.ts
```

`genericStore` coordinates loading, caching, and state used by tables/dialogs. API services centralize request behavior and error handling.

## Translation Loading

Important files:

```text
frontend/src/stores/translationStore.ts
frontend/src/services/translation.service.ts
frontend/src/composables/generic/useTranslationLoader.ts
```

Components should load the namespaces they render.

Examples:

```ts
useTranslationLoader('global', 'ticket', 'company')
```

Avoid hard-coded labels when translations exist.

## Template-Driven Field Rendering

The edit dialog uses `EntityTemplateDto` from the backend.

Main renderer:

```text
frontend/src/components/dialog/SaplingDialogEditFieldRenderer.vue
```

Selection examples:

| Backend metadata | Frontend field |
| --- | --- |
| relation field | single-select reference |
| `genericReference` | generic reference selector |
| `isMarkdown` | markdown editor/preview |
| `isMoney` | money field |
| `isPercent` | percent field |
| `isNumeric` | numeric stepper |
| `isPhone` | phone field |
| `isMail` | mail field |
| `isLink` | link field |
| `isColor` | color picker |
| `isIcon` | icon picker |
| `isSecurity` | password/security field |
| boolean type | boolean field |
| date/datetime type | date/time field |
| JSON type | JSON field |

If a new field behavior is generally useful, add a Sapling option and renderer branch rather than special-casing one entity.

Active custom field definitions are appended to the same template metadata as
generated fields named `customFields.<fieldKey>`. The edit dialog renders the
supported primitive/select custom field types with the normal field renderer
pipeline and saves them back as a nested `customFields` payload. The definition
itself selects its type through the `customFieldType` reference entity, so users
choose from seeded type records instead of entering raw type strings. Generic
table rows receive flattened hydrated values for display.

Markdown fields can reference stored Sapling documents without new upload logic.
Use `sapling-document:<handle>` as a normal markdown link or image URL, or embed
media inline with `{{sapling-image:123|Screenshot}}`,
`{{sapling-audio:123|Audio note}}`, `{{sapling-video:123|Demo video}}`, or
`{{sapling-document:123|Open document}}`. The handle is the existing
`document` record handle and permissions are enforced by the document API.

## Tables

Table behavior is split across composables in:

```text
frontend/src/composables/table/
```

Common responsibilities:

- loading pages
- filters
- column filters
- multi-select
- row actions
- chips
- upload behavior
- table component state

Table columns are driven by template metadata and translations.
`SaplingForm` metadata carries explicit defaults for form, desktop table, and
mobile table rendering. Desktop columns use `tableVisible` and `tableOrder`.
Mobile table cards use separate `mobileVisible` and `mobileOrder` metadata.
The current entity convention sets `mobileVisible: true` only for fields marked
with `isValue`, but this is stored in the decorator and not inferred in the
frontend. Hiding a field from the desktop table does not automatically hide a
mobile-visible field.

## Dialogs

Dialog files live under:

```text
frontend/src/components/dialog/
frontend/src/composables/dialog/
```

Dialogs use:

- template metadata for fields
- translation keys for labels
- generic API for create/update/delete
- reference metadata for relation selectors
- Sapling options for specialized fields

## Context Menus And Script Buttons

Context and action components connect UI actions to generic records and backend script-button behavior.

Important areas:

```text
frontend/src/components/context/
frontend/src/components/actions/
frontend/src/services/api.script.service.ts
backend/src/script/
```

## Permissions In UI

Frontend permissions are loaded from current metadata and permission stores.

Important files:

```text
frontend/src/stores/currentPermissionStore.ts
frontend/src/stores/currentPersonStore.ts
frontend/src/utils/entityAccess.ts
backend/src/api/current/
```

The frontend should hide or disable actions based on permissions, but backend guards remain authoritative.

## Adding A Generic Entity To The UI

Usually no frontend route is needed.

Backend/seed requirements:

1. Entity registered in `ENTITY_REGISTRY`.
2. Entity seeded in `entityData_XXX.json`.
3. Route seeded in `entityRouteData_XXX.json`.
4. Navigation group exists.
5. Translations exist.
6. Permissions allow show/read for relevant roles.

Frontend changes are needed only when:

- the entity needs a custom workflow view
- a new field option/renderer is required
- an existing table/dialog behavior does not support the desired relation or field type

## Design Guidance

- Prefer metadata-driven behavior.
- Avoid one-off entity checks when a generic option would solve the problem.
- Keep translations loaded explicitly per feature.
- Keep fields responsive through template `formWidth`.
- Keep custom views for workflow-heavy features, not basic CRUD.
