export interface SaplingProfileAction {
  key: string
  icon: string
  label: string
  handler: () => void | Promise<void>
}
