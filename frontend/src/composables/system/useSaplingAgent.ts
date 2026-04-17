import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRouter } from 'vue-router'
import ApiGenericService from '@/services/api.generic.service'
import type { EntityItem } from '@/entity/entity'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { i18n } from '@/i18n'

interface SaplingAgentEntityOption {
  title: string
  value: string
  icon: string | null | undefined
}

/**
 * Encapsulates the AI agent launcher state and routes valid requests into the
 * existing entity table flow.
 */
export function useSaplingAgent() {
  //#region State
  const router = useRouter()
  const { isLoading } = useTranslationLoader('global', 'agent', 'navigation')
  const searchMenu = ref(false)
  const searchQuery = ref('')
  const selectedEntity = ref<string | null>(null)
  const entities = ref<EntityItem[]>([])
  const isEntityLoading = ref(false)
  //#endregion

  //#region Computed
  const normalizedSearchQuery = computed(() => searchQuery.value.trim())

  const entityOptions = computed<SaplingAgentEntityOption[]>(() =>
    entities.value
      .filter(
        (entity): entity is EntityItem & { handle: string } =>
          typeof entity.handle === 'string' && entity.handle.length > 0,
      )
      .map((entity) => ({
        title: i18n.global.t(`navigation.${entity.handle}`),
        value: entity.handle,
        icon: entity.icon,
      })),
  )

  const canSubmit = computed(
    () => normalizedSearchQuery.value.length > 0 && selectedEntity.value !== null,
  )

  const taskRules = [
    (value: unknown) =>
      Boolean(typeof value === 'string' ? value.trim() : value) ||
      `${i18n.global.t('agent.task')} ${i18n.global.t('global.isRequired')}`,
  ]

  const entityRules = [
    (value: string | null) =>
      value !== null ||
      `${i18n.global.t('navigation.entity')} ${i18n.global.t('global.isRequired')}`,
  ]
  //#endregion

  //#region Lifecycle
  /**
   * Lazily loads available entities once the launcher is opened.
   */
  watch(searchMenu, async (isOpen) => {
    if (!isOpen || entities.value.length > 0 || isEntityLoading.value) {
      return
    }

    await loadAvailableEntities()
  })
  //#endregion

  //#region Methods
  /**
   * Opens the agent launcher menu.
   */
  function openMenu() {
    searchMenu.value = true
  }

  /**
   * Closes the agent launcher menu.
   */
  function closeMenu() {
    searchMenu.value = false
  }

  /**
   * Fetches all entities that can be targeted by the agent flow.
   */
  async function loadAvailableEntities() {
    isEntityLoading.value = true

    try {
      const result = await ApiGenericService.find<EntityItem>('entity', {
        filter: { canShow: true },
      })
      entities.value = result.data || []
    } finally {
      isEntityLoading.value = false
    }
  }

  /**
   * Resets the launcher form after a successful navigation.
   */
  function resetForm() {
    searchQuery.value = ''
    selectedEntity.value = null
  }

  /**
   * Builds the target route for the selected entity table.
   */
  function buildSearchRoute(): RouteLocationRaw | null {
    if (!canSubmit.value || !selectedEntity.value) {
      return null
    }

    return {
      path: `/table/${selectedEntity.value}`,
      query: {
        search: normalizedSearchQuery.value,
      },
    }
  }

  /**
   * Navigates to the selected entity table while preserving the free-text task
   * as a table search query.
   */
  async function onSearch() {
    const route = buildSearchRoute()
    if (!route) {
      return
    }

    closeMenu()
    await router.push(route)
    resetForm()
  }
  //#endregion

  //#region Return
  return {
    isLoading,
    isEntityLoading,
    searchMenu,
    searchQuery,
    selectedEntity,
    entityOptions,
    canSubmit,
    taskRules,
    entityRules,
    openMenu,
    closeMenu,
    onSearch,
  }
  //#endregion
}
