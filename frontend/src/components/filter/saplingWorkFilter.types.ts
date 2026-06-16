export type SaplingFilterHandle = string | number

export interface SaplingChipFilterOption {
  handle: SaplingFilterHandle
  label: string
  color?: string
  icon?: string
  isDefaultSelected?: boolean
}

export interface SaplingChipFilterGroup {
  key: string
  fieldName: string
  referenceName: string
  identifierKey: string
  label: string
  options: SaplingChipFilterOption[]
}

export type SaplingChipFilterSelection = Record<string, SaplingFilterHandle[]>
