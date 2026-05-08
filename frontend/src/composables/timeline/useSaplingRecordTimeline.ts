import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGenericStore } from '@/stores/genericStore'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiGenericService from '@/services/api.generic.service'
import type { TimelineMonth, TimelineResponse } from '@/entity/structure'

const DEFAULT_TIMELINE_MONTH_BATCH = 6

interface UseSaplingRecordTimelineOptions {
  entityHandle?: MaybeRefOrGetter<string | null | undefined>
  recordHandle?: MaybeRefOrGetter<string | number | null | undefined>
  active?: MaybeRefOrGetter<boolean | null | undefined>
  onNavigate?: () => void | Promise<void>
}

export function useSaplingRecordTimeline(options: UseSaplingRecordTimelineOptions = {}) {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const genericStore = useGenericStore()
  const { isLoading: isTranslationLoading } = useTranslationLoader(
    'global',
    'navigation',
    'timeline',
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
  const response = ref<TimelineResponse | null>(null)
  const months = ref<TimelineMonth[]>([])
  const hasMore = ref(false)
  const nextBefore = ref<string | null>(null)
  const isInitialLoading = ref(false)
  const isLoadingMore = ref(false)
  const error = ref('')
  const loadMoreTriggerRef = ref<HTMLElement | null>(null)

  let observer: IntersectionObserver | null = null

  const entityState = computed(() => genericStore.getState(entityHandle.value))
  const entity = computed(() => entityState.value.entity)
  const entityTemplates = computed(() => entityState.value.entityTemplates)
  const anchor = computed(() => response.value?.anchor ?? null)
  const isLoading = computed(
    () => isInitialLoading.value || (entityState.value.isLoading && response.value == null),
  )
  const isBusy = computed(
    () => isLoading.value || isTranslationLoading.value || isLoadingMore.value,
  )

  async function ensureTimelineEntityTranslations(timeline: TimelineResponse) {
    const relatedEntityHandles = [
      ...new Set(
        timeline.months.flatMap((month) => month.entities.map((summary) => summary.entityHandle)),
      ),
    ]

    if (relatedEntityHandles.length === 0) {
      return
    }

    await genericStore.loadGenericMany(
      relatedEntityHandles.map((relatedEntityHandle) => ({
        entityHandle: relatedEntityHandle,
        namespaces: [],
      })),
    )
  }

  async function initialize() {
    if (!isActive.value || !entityHandle.value || !recordHandle.value) {
      return
    }

    isInitialLoading.value = true
    error.value = ''

    try {
      await genericStore.loadGeneric(entityHandle.value, 'global', 'navigation')
      const timeline = await ApiGenericService.getTimeline(entityHandle.value, recordHandle.value, {
        months: DEFAULT_TIMELINE_MONTH_BATCH,
      })
      await ensureTimelineEntityTranslations(timeline)

      response.value = timeline
      months.value = timeline.months
      hasMore.value = timeline.hasMore
      nextBefore.value = timeline.nextBefore ?? null
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : t('timeline.loadFailed')
      response.value = null
      months.value = []
      hasMore.value = false
      nextBefore.value = null
    } finally {
      isInitialLoading.value = false
      refreshObserver()
    }
  }

  async function loadMore() {
    if (
      isInitialLoading.value ||
      isLoadingMore.value ||
      !hasMore.value ||
      !nextBefore.value ||
      !entityHandle.value ||
      !recordHandle.value
    ) {
      return
    }

    isLoadingMore.value = true

    try {
      const timeline = await ApiGenericService.getTimeline(entityHandle.value, recordHandle.value, {
        before: nextBefore.value,
        months: DEFAULT_TIMELINE_MONTH_BATCH,
      })
      await ensureTimelineEntityTranslations(timeline)

      const existingKeys = new Set(months.value.map((month) => month.key))
      months.value = [
        ...months.value,
        ...timeline.months.filter((month) => !existingKeys.has(month.key)),
      ]
      hasMore.value = timeline.hasMore
      nextBefore.value = timeline.nextBefore ?? null
    } catch (caughtError) {
      error.value =
        caughtError instanceof Error ? caughtError.message : t('timeline.loadMoreFailed')
      hasMore.value = false
      nextBefore.value = null
    } finally {
      isLoadingMore.value = false
      refreshObserver()
    }
  }

  async function openMainTable() {
    if (!anchor.value) {
      return
    }

    await router.push({
      path: `/table/${entityHandle.value}`,
      query: {
        filter: JSON.stringify({ handle: anchor.value.handle }),
      },
    })

    await Promise.resolve(options.onNavigate?.())
  }

  async function openDrilldown(entityHandleValue: string, filter: Record<string, unknown>) {
    await router.push({
      path: `/table/${entityHandleValue}`,
      query: {
        filter: JSON.stringify(filter),
      },
    })

    await Promise.resolve(options.onNavigate?.())
  }

  function refreshObserver() {
    disconnectObserver()

    if (!loadMoreTriggerRef.value || !hasMore.value) {
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore()
        }
      },
      {
        rootMargin: '320px 0px 320px 0px',
      },
    )

    observer.observe(loadMoreTriggerRef.value)
  }

  function disconnectObserver() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  watch([entityHandle, recordHandle, isActive], ([nextEntityHandle, nextRecordHandle, nextIsActive]) => {
    if (!nextIsActive || !nextEntityHandle || !nextRecordHandle) {
      disconnectObserver()
      return
    }

    void initialize()
  })

  watch(loadMoreTriggerRef as Ref<HTMLElement | null>, () => {
    refreshObserver()
  })

  onMounted(() => {
    if (isActive.value) {
      void initialize()
    }
  })

  onBeforeUnmount(() => {
    disconnectObserver()
  })

  return {
    entityHandle,
    recordHandle,
    entity,
    entityTemplates,
    anchor,
    months,
    error,
    hasMore,
    isLoading,
    isLoadingMore,
    isBusy,
    loadMoreTriggerRef,
    openMainTable,
    openDrilldown,
  }
}
