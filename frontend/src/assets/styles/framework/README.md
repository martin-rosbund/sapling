# Sapling Frontend Style Framework

This directory is the single shared visual contract for the Sapling frontend.
Feature components should compose framework classes, tokens, and shared Vue
surface components before adding local CSS.

## Entry Points

- Application CSS is imported once in `frontend/src/main.ts` via
  `SaplingFramework.css`.
- Framework partials are imported only by `SaplingFramework.css`.
- Components must not import framework partials directly.
- The only current non-framework CSS exception is
  `components/SaplingFileMailPreview.css`, which is loaded with `?url` into the
  mail preview iframe and must remain isolated from app styles.

## Layer Map

- `SaplingTokens.css`: spacing, radii, dimensions, opacity, typography, motion,
  and semantic surface tokens
- `SaplingBase.css`: global box sizing, root height, and app-wide base helpers
- `SaplingShells.css`: page shells, fill layouts, scroll shells, and section
  structure
- `SaplingUtilities.css`: generic utility classes, inline clusters, menu
  surfaces, truncation, visibility, shortcut keys, and compact helpers
- `SaplingSurfaces.css`: shared surfaces, cards, metrics, empty states, detail
  grids, and reusable panel primitives
- `SaplingFrameworkAppearance.css`: light/dark appearance variables, glass,
  tilt, performance states, background blobs, and Vuetify appearance chrome
- `SaplingFrameworkActions.css`: action bars, action stacks, toolbar groups,
  and button clusters
- `SaplingFrameworkCalendar.css`: calendar pages, calendar context panels,
  Vuetify calendar chrome, event cards, and event editor layouts
- `SaplingFrameworkConfig.css`: configuration forms, config matrices, settings
  panels, and admin configuration controls
- `SaplingFrameworkDialogs.css`: dialog shells, dialog cards, widths, account,
  help, delete, json, template, and access-pending dialogs
- `SaplingFrameworkFiles.css`: document headers, file mail summaries, attachment
  chips, and document body layouts
- `SaplingFrameworkForms.css`: upload controls, field controls, select fields,
  CodeMirror, markdown editor/content, and recurrence form layouts
- `SaplingFrameworkHeader.css`: app header, profile trigger, action header
  regions, and header responsive behavior
- `SaplingFrameworkHeroes.css`: page hero and hero media patterns
- `SaplingFrameworkHistory.css`: change history, record timelines, and history
  detail cards
- `SaplingFrameworkKpis.css`: KPI surfaces, KPI cards, widget grids, and KPI
  dashboard layouts
- `SaplingFrameworkLists.css`: list cards, stat cards, note cards, chip rows,
  and interactive list items
- `SaplingFrameworkMenus.css`: floating previews, identity chips, context menus,
  menu panels, and menu options
- `SaplingFrameworkMessaging.css`: AI chat, chat rails, message center,
  transient messages, and message dialog workflows
- `SaplingFrameworkNavigation.css`: drawer shell, favorites, search panel,
  navigation cards, routes, and navigation empty states
- `SaplingFrameworkOperations.css`: admin, permission, attention, system, and
  inbox-style workflows
- `SaplingFrameworkOverlays.css`: overlay shells, floating panels, command
  palette, vectorization overlays, and overlay motion
- `SaplingFrameworkPreview.css`: preview viewers, preview panels, embedded
  previews, media cards, and preview player shells
- `SaplingFrameworkRecordDialog.css`: record edit dialogs, grouped fields,
  relation tabs, and record dialog layout primitives
- `SaplingFrameworkShowcase.css`: component showcase pages, demo frames, and
  launchpads
- `SaplingFrameworkTableFilters.css`: table filter menus, filter controls, and
  filter-state layout
- `SaplingFrameworkTables.css`: data tables, sticky table behavior, mobile table
  cards, table selection, and row states
- `SaplingFrameworkWorkItems.css`: work-item dashboards, issue streams, work
  cards, filter panels, and compose surfaces
- `SaplingFrameworkWorkspaces.css`: dashboard shells, page workspaces,
  browser/partner layouts, tabs, boards, and workspace grids

## Pattern Index

Use these shared patterns before creating a new class family:

- Page layout: `sapling-page-shell`, `sapling-section-stack`,
  `sapling-fill-shell`
- Dashboard pages: `sapling-dashboard`, `sapling-dashboard__hero`,
  `sapling-dashboard__tab`
- Surfaces: `SaplingSurface`, `sapling-section-panel`, `sapling-data-card`,
  `sapling-soft-panel`
- Headers: `sapling-section-header`, `sapling-section-title`,
  `sapling-eyebrow`
- Metrics and stats: `sapling-metric-card`, `sapling-icon-tile`,
  `sapling-stat-grid`, `sapling-stat-card`
- Details: `sapling-detail-grid`, `sapling-detail-card`
- Lists: `sapling-list-card`, `sapling-list-card__summary`,
  `sapling-list-card__actions`
- Interactive lists: `sapling-interactive-list-item` with icon, content, and
  row parts
- Empty states: `sapling-empty-state-panel` with size modifiers
- Compact helpers: `sapling-chip-row`, `sapling-inline-empty`,
  `sapling-soft-chip`
- Actions: `sapling-action-bar`, `sapling-action-stack`,
  `sapling-action-cluster`
- Toolbars: `sapling-toolbar-shell`, `sapling-toolbar-controls`,
  `sapling-toolbar-slot`, `sapling-split-toolbar`, `sapling-toolbar-group`
- Menus: `sapling-menu-panel`, `sapling-menu-section`,
  `sapling-menu-option`, `sapling-context-menu__content`
- Floating previews: `sapling-floating-preview` with icon, meta, pill, and
  title parts
- Navigation: `sapling-drawer-shell`, `sapling-drawer-hero`,
  `sapling-nav-card`, `sapling-favorites-panel`
- Identity chips: `sapling-identity-chip`, `sapling-identity-avatar`,
  `sapling-identity-copy`
- Files: `sapling-document-header`, `sapling-file-mail-layout`,
  `sapling-file-mail-text`
- Overlays: `sapling-floating-panel`, `sapling-command-palette`,
  `sapling-vectorization`
- Messaging: `sapling-ai-chat`, `sapling-chat-layout`,
  `sapling-message-center-entry`, `messages-float`
- Dialogs: `sapling-dialog-shell`, `sapling-dialog-card`,
  `sapling-account-dialog__content`, `sapling-workhours-card`
- Forms: `sapling-upload`, `sapling-upload-dropzone`,
  `sapling-field-color`, `sapling-field-select__activator`,
  `sapling-field-generic-reference`
- Editors: `sapling-codemirror`, `sapling-markdown-content`,
  `sapling-markdown-workspace`, `sapling-markdown-pane`,
  `sapling-markdown-preview`
- Shortcut keys: `sapling-shortcut-keys` with size modifiers
- Notes: `sapling-note-tabs`, `sapling-note-card`, `sapling-add-note-card`
- Recurrence fields: `sapling-field-event-recurrence`, option grids, trigger,
  and preview
- Calendars: `sapling-calendar-frame`, `sapling-calendar-event-card`
- History: `sapling-history-card`, `sapling-history-summary-grid`,
  `sapling-record-timeline__timeline`, `sapling-record-change-log`
- Admin and system areas: `sapling-admin-layout`, `sapling-admin-sidebar`,
  `sapling-system-metrics`, `sapling-system-layout`, `sapling-system-gauge`
- Partner workspaces: `sapling-partner-layout`,
  `sapling-partner-table-scroll`, `sapling-partner-filter-panel`
- Attention queues: `sapling-attention-content`,
  `sapling-attention-section`, `sapling-attention-card`
- Record dialogs: `sapling-record-dialog-shell`, `sapling-record-section`,
  `sapling-record-field-shell`
- Template dialogs: `sapling-dashboard-template-dialog`,
  `sapling-dashboard-template-entry`
- Work items: `sapling-work-compose`, `sapling-work-stream`,
  `sapling-work-card`, `sapling-work-filter-panel`
- Showcases: `sapling-showcase`, `sapling-showcase__section-card`,
  `sapling-showcase__demo-frame`
- KPI dashboards: `sapling-kpi-surface`, `sapling-kpi-card`,
  `sapling-kpi-widget`
- Appearance states: `data-sapling-theme`, `data-sapling-glass`,
  `data-sapling-tilt`, `data-sapling-performance`

## Rules For New CSS

1. Reuse tokens from `SaplingTokens.css` before adding new values.
2. Extend an existing framework layer when a pattern is reusable across
   features.
3. Do not add `<style>` blocks or component-local CSS imports in `.vue` files.
4. Keep local feature CSS only for behavior or domain-specific layout that
   cannot be expressed by shared patterns.
5. Allowed local CSS examples: external iframe preview stylesheets, third-party
   rendered content boundaries, and very small behavior-only deltas.
6. Dynamic `:style` bindings are allowed only for runtime values such as menu
   coordinates, event geometry, chart widths, external label colors, or CSS
   custom properties that cannot be known in static CSS.
7. Avoid restating spacing, borders, radii, label typography, detail grids,
   card surfaces, empty states, dialog chrome, and toolbar layout in feature
   CSS.

## Appearance Model

Appearance is static CSS plus root attributes. `useSaplingAppearance` owns
cookies, Vuetify theme changes, root attributes, and the
`sapling:appearance-change` event. The CSS itself lives in
`SaplingFrameworkAppearance.css`; no appearance bundle is loaded dynamically.

The active states are:

- `data-sapling-theme="light|dark"`
- `data-sapling-glass="on|off"`
- `data-sapling-tilt="on|off"`
- `data-sapling-performance="full|reduced"`

## Completion Status

The framework migration is complete for app-level CSS. The style tree now has a
single app entry point, framework-owned partials, and one intentional iframe
preview stylesheet outside the framework.

Vue components do not contain `<style>` blocks or component-local CSS imports.
