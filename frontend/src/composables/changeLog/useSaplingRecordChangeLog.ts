import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGenericStore } from '@/stores/genericStore'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiGenericService from '@/services/api.generic.service'
import type { ChangeLogEntry } from '@/entity/structure'

interface UseSaplingRecordChangeLogOptions {
  entityHandle?: MaybeRefOrGetter<string | null | undefined>
  recordHandle?: MaybeRefOrGetter<string | number | null | undefined>
  active?: MaybeRefOrGetter<boolean | null | undefined>
}

export function useSaplingRecordChangeLog(options: UseSaplingRecordChangeLogOptions = {}) {
  const route = useRoute()
  const { t } = useI18n()
  const genericStore = useGenericStore()
  const { isLoading: isTranslationLoading } = useTranslationLoader(
    'global',
    'navigation',
    'changeLog',
  )

  const entityHandle = computed(() => {
    const value = options.entityHandle != null ? toValue(options.entityHandle) : route.params.entity
    return String(value ?? '')
  })
  const recordHandle = computed(() => {
    const value = options.recordHandle != null ? toValue(options.recordHandle) : route.params.handle
    return String(value ?? '')
  })
  const isActive = computed(() =>
    options.active == null ? true : Boolean(toValue(options.active)),
  )

  const entityState = computed(() => genericStore.getState(entityHandle.value))
  const entity = computed(() => entityState.value.entity)
  const entityTemplates = computed(() => entityState.value.entityTemplates)
  const entries = ref<ChangeLogEntry[]>([])
  const isInitialLoading = ref(false)
  const error = ref('')
  const isLoading = computed(
    () => isInitialLoading.value || (entityState.value.isLoading && entries.value.length === 0),
  )

  async function initialize() {
    if (!isActive.value || !entityHandle.value || !recordHandle.value) {
      entries.value = []
      error.value = ''
      return
    }

    isInitialLoading.value = true
    error.value = ''

    try {
      await genericStore.loadGeneric(entityHandle.value, 'global', 'navigation')
      entries.value = await ApiGenericService.getChangeLog(entityHandle.value, recordHandle.value)
    } catch (caughtError) {
      entries.value = []
      error.value = caughtError instanceof Error ? caughtError.message : t('changeLog.loadFailed')
    } finally {
      isInitialLoading.value = false
    }
  }

  watch(
    [entityHandle, recordHandle, isActive],
    () => {
      void initialize()
    },
    { immediate: true },
  )

  return {
    entityHandle,
    recordHandle,
    entity,
    entityTemplates,
    entries,
    error,
    isLoading,
    isTranslationLoading,
    initialize,
  }
}
