import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ApiDocumentService from '@/services/api.document.service'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useGenericStore } from '@/stores/genericStore'
import type { SaplingGenericItem } from '@/entity/entity'

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
  const files = ref<File[]>([])
  const description = ref('')
  const isUploading = ref(false)
  const referenceHandle = computed(() => {
    const handle = props.item?.handle
    return handle == null ? '' : String(handle)
  })
  const { t } = useI18n()
  const { pushMessage } = useSaplingMessageCenter()
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
  function normalizeFiles(input: File[] | FileList | File | null | undefined): File[] {
    if (!input) {
      return []
    }

    if (Array.isArray(input)) {
      return input
    }

    if (input instanceof File) {
      return [input]
    }

    return Array.from(input)
  }

  function getFileIdentity(file: File) {
    return `${file.name}|${file.size}|${file.lastModified}`
  }

  function dedupeFiles(items: File[]) {
    const seen = new Set<string>()

    return items.filter((file) => {
      const key = getFileIdentity(file)
      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
  }

  function setFiles(
    nextFiles: File[] | FileList | File | null | undefined,
    options: { append?: boolean } = {},
  ) {
    const normalizedFiles = normalizeFiles(nextFiles)

    files.value = options.append
      ? dedupeFiles([...files.value, ...normalizedFiles])
      : dedupeFiles(normalizedFiles)
  }

  function removeFile(index: number) {
    files.value = files.value.filter((_, currentIndex) => currentIndex !== index)
  }

  function resetForm() {
    files.value = []
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
    if (!files.value.length || !referenceHandle.value) {
      return
    }

    isUploading.value = true

    const failedFiles: File[] = []
    let uploadedCount = 0

    try {
      for (const file of files.value) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('typeHandle', 'document')
        formData.append('description', description.value.trim())

        try {
          await ApiDocumentService.upload(props.entityHandle, referenceHandle.value, formData)
          uploadedCount += 1
        } catch {
          failedFiles.push(file)
        }
      }

      if (uploadedCount > 0) {
        pushMessage(
          failedFiles.length > 0 ? 'warning' : 'success',
          t('document.uploadCompleted'),
          failedFiles.length > 0
            ? t('document.uploadPartialDescription', {
                successCount: uploadedCount,
                failedCount: failedFiles.length,
              })
            : t('document.uploadCompletedDescription', { count: uploadedCount }),
          props.entityHandle,
        )
      }

      if (failedFiles.length > 0) {
        files.value = failedFiles
        return
      }

      resetForm()
      emit('uploaded')
    } finally {
      isUploading.value = false
    }
  }
  // #endregion

  return {
    files,
    description,
    isUploading,
    isLoading,
    setFiles,
    removeFile,
    onUpload,
    onDialogModelValueUpdate,
  }
}
