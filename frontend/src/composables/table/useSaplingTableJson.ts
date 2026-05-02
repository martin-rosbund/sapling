import type { SaplingGenericItem } from '@/entity/entity'
import type { EntityTemplate } from '@/entity/structure'
import { computed, ref } from 'vue'
import CookieService from '@/services/cookie.service'

export interface UseSaplingTableJsonProps {
  item: SaplingGenericItem
  template: EntityTemplate
  entityHandle: string
  jsonDialogKey?: string | null
}

/**
 * Handles the readonly JSON preview dialog for table cells.
 */
export function useSaplingTableJson(props: UseSaplingTableJsonProps) {
  // #region State
  const dialogKey = ref<string | null>(props.jsonDialogKey ?? null)
  const templateKey = computed(() => props.template.key ?? null)
  // #endregion

  // #region Dialog
  function openJsonDialog(key?: string | null) {
    dialogKey.value = key ?? templateKey.value
  }

  function closeJsonDialog() {
    dialogKey.value = null
  }

  const isDialogOpen = computed({
    get: () => Boolean(templateKey.value && dialogKey.value === templateKey.value),
    set: (value: boolean) => {
      if (value) {
        openJsonDialog()
      } else {
        closeJsonDialog()
      }
    },
  })
  // #endregion

  // #region Presentation
  const formattedJson = computed({
    get() {
      return JSON.stringify(props.item[props.template.key || ''] ?? {}, null, 2).trim()
    },
    set() {
      // read-only, do nothing
    },
  })

  const dialogTitleKey = computed(() => `${props.entityHandle}.${props.template.name}`)

  const editorTheme = computed(() => (CookieService.get('theme') === 'dark' ? 'dark' : 'light'))
  // #endregion

  return {
    isDialogOpen,
    openJsonDialog,
    closeJsonDialog,
    formattedJson,
    dialogTitleKey,
    editorTheme,
  }
}
