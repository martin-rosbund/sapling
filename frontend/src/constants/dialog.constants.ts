/**
 * Standardized maximum widths for dialogs (`v-dialog max-width`).
 *
 * Use these constants instead of magic numbers so dialogs share a
 * consistent visual rhythm across the application.
 *
 * - `xs`  Confirmation prompts and tiny pickers
 * - `sm`  Compact forms with a few fields
 * - `md`  Default forms (1 column)
 * - `lg`  Forms with rich-text/markdown content (50/50 layout)
 * - `xl`  Wide editors, side-by-side panels
 * - `xxl` Full-screen workspaces
 * - `3xl` Extra-wide entity edit workspaces with relation tabs
 */
export const SAPLING_DIALOG_MAX_WIDTH = {
  xs: 400,
  sm: 560,
  md: 680,
  lg: 960,
  xl: 1200,
  xxl: 1440,
  '3xl': 1760,
} as const

export type SaplingDialogSize = keyof typeof SAPLING_DIALOG_MAX_WIDTH

/**
 * Standardized heights for tall workspace dialogs (`v-dialog height`).
 * Mirrors the CSS variable `--sapling-dialog-card-height` (90vh) used by
 * dialogs like the mail composer and the entity edit dialog.
 */
export const SAPLING_DIALOG_HEIGHT = {
  md: '70vh',
  lg: '85vh',
  xl: '90vh',
  xxl: '95vh',
} as const

export type SaplingDialogHeight = keyof typeof SAPLING_DIALOG_HEIGHT
