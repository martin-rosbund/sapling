# Sapling Frontend Style Framework

This folder is the shared visual contract for Sapling UI. Feature styles should
prefer these classes and tokens before adding local CSS.

## Import

Application CSS enters through `SaplingFramework.css`, which is imported once by
`SaplingStyles.css`. Do not import framework partials directly from components.

## File Map

- `SaplingSurfaces.css`: base surfaces, panels, cards, metrics, and empty states
- `SaplingFrameworkLists.css`: list cards, stat cards, chip rows, and interactive list items
- `SaplingFrameworkMenus.css`: floating previews, identity chips, and menu panels/options
- `SaplingFrameworkNavigation.css`: drawer, search-panel, and navigation-item patterns
- `SaplingFrameworkCalendar.css`: shared Vuetify calendar chrome

## Use Shared Patterns First

- Page layout: `sapling-page-shell`, `sapling-section-stack`, `sapling-fill-shell`
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
- Forms: `sapling-upload`, `sapling-upload-dropzone`, `sapling-upload-selection`

## When Feature CSS Is Allowed

Keep feature CSS only for behavior or domain-specific layout that cannot be
expressed by the shared patterns: table stickiness, calendar positioning,
editor rendering, accent bars, external content previews, and custom animation.

Local feature CSS should define the smallest possible delta over framework
classes. Avoid restating spacing, borders, radii, label typography, grid detail
cards, or empty-state layout.

## Tokens

Use `SaplingTokens.css` for semantic values only. Prefer reusing existing tokens
over creating one-off variables for a single component. Component-specific
dimensions belong in the component stylesheet until they prove reusable.
