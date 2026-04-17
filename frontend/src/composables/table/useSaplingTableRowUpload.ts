import { computed, ref, watch } from 'vue'
import ApiService from '@/services/api.service'
import { useGenericStore } from '@/stores/genericStore'
import type { SaplingGenericItem } from '@/entity/entity'

type UploadValidationResult = boolean | { valid: boolean }
type UploadFormRef = {
  validate?: () => Promise<UploadValidationResult>
}

export interface UseSaplingTableRowUploadProps {
  show: boolean
  item: SaplingGenericItem | null
  entityHandle: string
}

export type UseSaplingTableRowUploadEmit = {
  (event: 'close'): void
  (event: 'uploaded'): void
}

/**
 * Handles document upload state for a single table row action.
 */
export function useSaplingTableRowUpload(
  props: UseSaplingTableRowUploadProps,
  emit: UseSaplingTableRowUploadEmit,
) {
  // #region State
  const file = ref<File | null>(null)
  const description = ref('')
  const isUploading = ref(false)
  const formRef = ref<UploadFormRef | null>(null)
  const referenceHandle = computed(() => {
    const handle = props.item?.handle
    return handle == null ? '' : String(handle)
  })
  // #endregion

  // #region Entity Loader
  const genericStore = useGenericStore()
  void genericStore.loadGeneric('document', 'global')
  const isLoading = computed(() => genericStore.getState('document').isLoading)
  // #endregion

  // #region Watchers
  watch(
    () => [props.show, referenceHandle.value] as const,
    ([isVisible]) => {
      if (!isVisible) {
        resetForm()
      }
    },
    { immediate: true },
  )
  // #endregion

  // #region Actions
  function resetForm() {
    file.value = null
    description.value = ''
    isUploading.value = false
  }

  function onDialogModelValueUpdate(value: boolean) {
    if (!value) {
      resetForm()
      emit('close')
    }
  }

  async function onUpload() {
    const validationResult = await formRef.value?.validate?.()
    const isValid =
      typeof validationResult === 'boolean' ? validationResult : (validationResult?.valid ?? true)

    if (!isValid || !file.value || !referenceHandle.value) {
      return
    }

    isUploading.value = true

    try {
      const formData = new FormData()
      formData.append('file', file.value)
      formData.append('typeHandle', 'document')
      formData.append('description', description.value)

      await ApiService.uploadDocument(props.entityHandle, referenceHandle.value, formData)
      resetForm()
      emit('uploaded')
    } catch {
      return
    } finally {
      isUploading.value = false
    }
  }
  // #endregion

  return {
    file,
    description,
    isUploading,
    formRef,
    isLoading,
    onUpload,
    onDialogModelValueUpdate,
  }
}
