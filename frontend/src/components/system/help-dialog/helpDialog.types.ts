export interface HelpShortcutEntry {
  id: string
  keys: string[]
  label: string
}

export interface HelpListEntry {
  id: string
  label: string
  hint?: string
  icon?: string
  example?: string
}
