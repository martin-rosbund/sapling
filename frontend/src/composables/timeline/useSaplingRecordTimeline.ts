import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGenericStore } from '@/stores/genericStore'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiGenericService from '@/services/api.generic.service'
import type { TimelineMonth, TimelineResponse } from '@/entity/structure'

const DEFAULT_TIMELINE_MONTH_BATCH = 6

export function useSaplingRecordTimeline() {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const genericStore = useGenericStore()
  const { isLoading: isTranslationLoading } = useTranslationLoader(
    'global',
    'navigation',
    'timeline',
  )

  const entityHandle = computed(() => String(route.params.entity ?? ''))
  const recordHandle = computed(() => String(route.params.handle ?? ''))
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
    if (!entityHandle.value || !recordHandle.value) {
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
  }

  async function openDrilldown(entityHandleValue: string, filter: Record<string, unknown>) {
    await router.push({
      path: `/table/${entityHandleValue}`,
      query: {
        filter: JSON.stringify(filter),
      },
    })
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

  watch([entityHandle, recordHandle], () => {
    void initialize()
  })

  watch(loadMoreTriggerRef as Ref<HTMLElement | null>, () => {
    refreshObserver()
  })

  onMounted(() => {
    void initialize()
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
