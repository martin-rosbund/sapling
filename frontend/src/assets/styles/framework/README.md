# Sapling Frontend Style Framework

This folder is the shared visual contract for Sapling UI. Feature styles should
prefer these classes and tokens before adding local CSS.

## Import

Application CSS enters through `SaplingFramework.css`, which is imported once by
`SaplingStyles.css`. Do not import framework partials directly from components.

## File Map

- `SaplingSurfaces.css`: base surfaces, panels, cards, metrics, and empty states
- `SaplingFrameworkLists.css`: list cards, stat cards, note cards, chip rows, and interactive list items
- `SaplingFrameworkMenus.css`: floating previews, identity chips, and menu panels/options
- `SaplingFrameworkNavigation.css`: drawer, search-panel, and navigation-item patterns
- `SaplingFrameworkWorkspaces.css`: dashboard shells, page workspaces, browser/partner layouts, tabs, and board grids
- `SaplingFrameworkForms.css`: upload controls, markdown fields, field panels, and recurrence form layouts
- `SaplingFrameworkDialogs.css`: dialog shells, cards, widths, delete/json/template dialogs, and access pending
- `SaplingFrameworkHistory.css`: change history, record timelines, and history detail cards
- `SaplingFrameworkOperations.css`: admin, permission, attention, system, and inbox-style workflows
- `SaplingFrameworkRecordDialog.css`: record edit dialogs, grouped fields, and relation tabs
- `SaplingFrameworkWorkItems.css`: work-item dashboards, issue streams, work cards, and filter panels
- `SaplingFrameworkShowcase.css`: component showcase pages, demo frames, and launchpads
- `SaplingFrameworkCalendar.css`: calendar pages, context panels, Vuetify chrome, and event cards
- `SaplingFrameworkKpis.css`: KPI dashboard grids, KPI cards, and KPI widget layouts

## Use Shared Patterns First

- Page layout: `sapling-page-shell`, `sapling-section-stack`, `sapling-fill-shell`
- Dashboard pages: `sapling-dashboard`, `sapling-dashboard__hero`, `sapling-dashboard__tab`
- Surfaces: `SaplingSurface`, `sapling-section-panel`, `sapling-data-card`
- Headers: `sapling-section-header`, `sapling-section-title`, `sapling-eyebrow`
- Metrics: `sapling-metric-card`, `sapling-icon-tile`, `sapling-metric-card__copy`
- Stats: `sapling-stat-grid`, `sapling-stat-card`, `sapling-stat-card__content`
- Details: `sapling-detail-grid`, `sapling-detail-card`
- Lists: `sapling-list-card`, `sapling-list-card__summary`, `sapling-list-card__actions`
- Interactive lists: `sapling-interactive-list-item` with icon, content, and row parts
- Record cards: `sapling-record-card`, `sapling-field-card`, `sapling-field-label`
- Empty states: `sapling-empty-state-panel` with size modifiers
- Compact helpers: `sapling-chip-row`, `sapling-inline-empty`, `sapling-soft-chip`
- Floating previews: `sapling-floating-preview` with icon, meta, pill, and title parts
- Menus: `sapling-menu-panel`, `sapling-menu-section`, `sapling-menu-option`
- Navigation drawers: `sapling-drawer-shell`, `sapling-drawer-hero`, `sapling-nav-card`
- Identity chips: `sapling-identity-chip`, `sapling-identity-avatar`, `sapling-identity-copy`
- Actions: `sapling-action-bar`, `sapling-action-stack`, `sapling-action-cluster`
- Split toolbars: `sapling-split-toolbar`, `sapling-toolbar-group`, `sapling-toolbar-toggle`
- Toolbars: `sapling-toolbar-shell`, `sapling-toolbar-controls`, `sapling-toolbar-slot`
- Calendars: `sapling-calendar-frame` for Vuetify calendar chrome and current-time styling
- Calendar events: `sapling-calendar-event-card` with density, recurring, readonly, and resize states
- Forms: `sapling-upload`, `sapling-upload-dropzone`, `sapling-upload-selection`
- Markdown fields: `sapling-markdown-workspace`, `sapling-markdown-pane`, `sapling-markdown-preview`
- Notes: `sapling-note-tabs`, `sapling-note-card`, `sapling-add-note-card`
- Recurrence fields: `sapling-field-event-recurrence`, option grids, trigger, and preview
- History timelines: `sapling-history-card`, `sapling-history-summary-grid`, `sapling-record-timeline__timeline`
- Change logs: `sapling-record-change-log`, `sapling-history-detail-table`, `sapling-change-log-detail-value`
- Admin areas: `sapling-admin-layout`, `sapling-admin-sidebar`, `sapling-admin-workspace`
- Partner workspaces: `sapling-partner-layout`, `sapling-partner-table-scroll`, `sapling-partner-filter-panel`
- Attention queues: `sapling-attention-content`, `sapling-attention-section`, `sapling-attention-card`
- System dashboards: `sapling-system-metrics`, `sapling-system-layout`, `sapling-system-gauge`
- Record dialogs: `sapling-record-dialog-shell`, `sapling-record-section`, `sapling-record-field-shell`
- Template dialogs: `sapling-dashboard-template-dialog`, `sapling-dashboard-template-entry`
- Work items: `sapling-work-compose`, `sapling-work-stream`, `sapling-work-card`, `sapling-work-filter-panel`
- Showcases: `sapling-showcase`, `sapling-showcase__section-card`, `sapling-showcase__demo-frame`
- KPI dashboards: `sapling-kpi-surface`, `sapling-kpi-card`, `sapling-kpi-widget`

## When Feature CSS Is Allowed

Keep feature CSS only for behavior or domain-specific layout that cannot be
expressed by the shared patterns: table stickiness, calendar positioning,
editor rendering, accent bars, external content previews, and custom animation.

Local feature CSS should define the smallest possible delta over framework
classes. Avoid restating spacing, borders, radii, label typography, grid detail
cards, or empty-state layout.

## Tokens

Use `SaplingTokens.css` for semantic values only. Prefer reusing existing tokens
over creating one-off variables for a single component. Reusable panel defaults
live behind the neutral `--sapling-panel-*` tokens. Component-specific
dimensions belong in the component stylesheet until they prove reusable.
