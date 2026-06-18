import { computed, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import { useGenericStore } from '@/stores/genericStore'
import { useSaplingGenericReferenceLookup } from './useSaplingGenericReferenceLookup'
import {
  getEntityValueLabel,
  getGenericReferenceEntityHandle,
  getGenericReferenceHandle,
} from '@/utils/saplingTableUtil'

export function useSaplingGenericReferenceTarget(options: {
  item: MaybeRefOrGetter<SaplingGenericItem | null | undefined>
  template: MaybeRefOrGetter<EntityTemplate | null | undefined>
  autoResolve?: boolean
}) {
  const { t, te } = useI18n()
  const genericStore = useGenericStore()
  const { getEntry, queuePrefetch, ensureResolved } = useSaplingGenericReferenceLookup()

  const item = computed(() => toValue(options.item) ?? null)
  const template = computed(() => toValue(options.template) ?? null)
  const targetEntityHandle = computed(() =>
    getGenericReferenceEntityHandle(item.value, template.value ?? undefined),
  )
  const targetHandle = computed(() =>
    getGenericReferenceHandle(item.value, template.value ?? undefined),
  )
  const cacheEntry = computed(() => getEntry(targetEntityHandle.value, targetHandle.value))
  const targetTemplates = computed(() =>
    targetEntityHandle.value ? genericStore.getState(targetEntityHandle.value).entityTemplates : [],
  )
  const targetEntity = computed(() =>
    targetEntityHandle.value ? genericStore.getState(targetEntityHandle.value).entity : null,
  )
  const resolvedItem = computed(() =>
    cacheEntry.value?.status === 'loaded' ? cacheEntry.value.item : null,
  )
  const isLoading = computed(() => cacheEntry.value?.status === 'loading')
  const hasTarget = computed(
    () =>
      Boolean(targetEntityHandle.value) && targetHandle.value !== null && targetHandle.value !== '',
  )
  const targetEntityLabel = computed(() => {
    if (!targetEntityHandle.value) {
      return ''
    }

    const translationKey = `navigation.${targetEntityHandle.value}`
    return te(translationKey) ? t(translationKey) : ''
  })
  const fallbackLabel = computed(() => {
    if (targetHandle.value == null || targetHandle.value === '') {
      return ''
    }

    return targetEntityLabel.value
      ? `${targetEntityLabel.value} #${String(targetHandle.value)}`
      : ''
  })
  const displayLabel = computed(() => {
    if (!resolvedItem.value) {
      return fallbackLabel.value
    }

    return getEntityValueLabel(resolvedItem.value, targetTemplates.value) || fallbackLabel.value
  })

  watch(
    [targetEntityHandle, targetHandle],
    ([entityHandle, handle]) => {
      if (options.autoResolve === false || !entityHandle || handle == null || handle === '') {
        return
      }

      queuePrefetch(entityHandle, handle)
    },
    { immediate: true },
  )

  async function ensureTargetResolved() {
    if (!hasTarget.value || !targetEntityHandle.value || targetHandle.value == null) {
      return null
    }

    return ensureResolved(targetEntityHandle.value, targetHandle.value)
  }

  return {
    cacheEntry,
    displayLabel,
    ensureTargetResolved,
    fallbackLabel,
    hasTarget,
    isLoading,
    resolvedItem,
    targetEntity,
    targetEntityHandle,
    targetHandle,
    targetTemplates,
    targetEntityLabel,
  }
}
