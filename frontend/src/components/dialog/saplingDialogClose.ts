import type { ComputedRef, InjectionKey } from 'vue'

export interface SaplingDialogCloseContext {
  close: ComputedRef<(() => void) | undefined>
  disabled: ComputedRef<boolean>
  label: ComputedRef<string>
}

export const saplingDialogCloseKey: InjectionKey<SaplingDialogCloseContext> =
  Symbol('saplingDialogClose')
