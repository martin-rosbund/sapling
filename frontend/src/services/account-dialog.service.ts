export type SaplingAccountDialogTab =
  | 'profile'
  | 'notifications'
  | 'sync'
  | 'security'
  | 'sessions'
  | 'preferences'
  | 'songbird'

export interface SaplingOpenAccountDialogDetail {
  tab?: SaplingAccountDialogTab
}

export const SAPLING_OPEN_ACCOUNT_DIALOG_EVENT = 'sapling:open-account-dialog'

export function openSaplingAccountDialog(tab?: SaplingAccountDialogTab) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<SaplingOpenAccountDialogDetail>(SAPLING_OPEN_ACCOUNT_DIALOG_EVENT, {
      detail: { tab },
    }),
  )
}
