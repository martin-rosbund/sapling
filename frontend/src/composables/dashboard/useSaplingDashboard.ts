import { computed, onMounted, ref } from 'vue'
import ApiService from '@/services/api.service'
import ApiGenericService from '@/services/api.generic.service'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { useSaplingFavoritesAccess } from '@/composables/dashboard/useSaplingFavorites'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import type {
  DashboardItem,
  DashboardTemplateItem,
  EntityItem,
  SaplingGenericItem,
} from '../../entity/entity'
import type { DialogSaveAction, EditDialogOptions, EntityTemplate } from '@/entity/structure'

interface DashboardForm {
  name: string
  kpis?: DashboardItem['kpis'] | number[]
  [key: string]: unknown
}

interface KpiRelationSource {
  kpis?: DashboardItem['kpis'] | DashboardTemplateItem['kpis'] | number[]
}

/**
 * Encapsulates dashboard loading, CRUD state, and dashboard-template workflows.
 */
export function useSaplingDashboard() {
  // #region State
  const dashboardDeleteDialog = ref(false)
  const dashboardToDelete = ref<DashboardItem | null>(null)
  const dashboardDialog = ref<EditDialogOptions>({ visible: false, mode: 'create', item: null })
  const dashboardTemplateDialog = ref<EditDialogOptions>({
    visible: false,
    mode: 'create',
    item: null,
  })
  const dashboardTemplateLoadDialog = ref(false)
  const applyingDashboardTemplateHandle = ref<DashboardTemplateItem['handle'] | null>(null)
  const dashboardEntity = ref<EntityItem | null>(null)
  const dashboardEntityTemplates = ref<EntityTemplate[]>([])
  const dashboardTemplateEntity = ref<EntityItem | null>(null)
  const dashboardTemplateEntityTemplates = ref<EntityTemplate[]>([])
  const availableDashboardTemplates = ref<DashboardTemplateItem[]>([])
  const dashboards = ref<DashboardItem[]>([])
  const activeTab = ref(0)
  const favoritesDrawer = ref(false)
  const currentPersonStore = useCurrentPersonStore()
  const { hasFavoritesAccess, ensureFavoritesAccess } = useSaplingFavoritesAccess()
  const { pushMessage } = useSaplingMessageCenter()
  const { isLoading, loadTranslations } = useTranslationLoader(
    'global',
    'dashboard',
    'dashboardTemplate',
    'kpi',
    'favorite',
    'person',
    'navigation',
  )
  const currentDashboard = computed(() => dashboards.value[activeTab.value] ?? null)
  const hasDashboards = computed(() => dashboards.value.length > 0)
  const isDashboardRemovable = computed(() => dashboards.value.length > 1)
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    await Promise.all([
      loadTranslations(),
      loadDashboardEntity(),
      loadDashboardEntityTemplates(),
      loadDashboardTemplateEntity(),
      loadDashboardTemplateEntityTemplates(),
      currentPersonStore.fetchCurrentPerson(),
    ])

    await Promise.all([loadDashboards(), loadAvailableDashboardTemplates()])
  })
  // #endregion

  // #region Loaders
  /**
   * Loads all dashboards for the current person including their KPI relations.
   */
  async function loadDashboards() {
    if (!currentPersonStore.person?.handle) {
      dashboards.value = []
      syncActiveTab()
      return
    }

    const dashboardRes = await ApiGenericService.find<DashboardItem>('dashboard', {
      filter: { person: { handle: currentPersonStore.person.handle } },
      relations: ['kpis'],
    })

    dashboards.value = dashboardRes.data || []
    syncActiveTab()
  }

  /**
   * Loads the dashboard form templates used by the shared edit dialog.
   */
  async function loadDashboardEntityTemplates() {
    dashboardEntityTemplates.value =
      await ApiService.findAll<EntityTemplate[]>('template/dashboard')
  }

  /**
   * Loads the dashboard entity metadata required by the shared edit dialog.
   */
  async function loadDashboardEntity() {
    dashboardEntity.value =
      (
        await ApiGenericService.find<EntityItem>('entity', {
          filter: { handle: 'dashboard' },
          limit: 1,
          page: 1,
        })
      ).data[0] || null
  }

  /**
   * Loads the dashboard-template form templates used by the shared edit dialog.
   */
  async function loadDashboardTemplateEntityTemplates() {
    dashboardTemplateEntityTemplates.value = await ApiService.findAll<EntityTemplate[]>(
      'template/dashboardTemplate',
    )
  }

  /**
   * Loads the dashboard-template entity metadata required by the shared edit dialog.
   */
  async function loadDashboardTemplateEntity() {
    dashboardTemplateEntity.value =
      (
        await ApiGenericService.find<EntityItem>('entity', {
          filter: { handle: 'dashboardTemplate' },
          limit: 1,
          page: 1,
        })
      ).data[0] || null
  }

  /**
   * Loads all dashboard templates visible to the current user.
   */
  async function loadAvailableDashboardTemplates() {
    if (!currentPersonStore.person?.handle) {
      availableDashboardTemplates.value = []
      return
    }

    const response = await ApiGenericService.find<DashboardTemplateItem>('dashboardTemplate', {
      orderBy: { isShared: 'DESC', name: 'ASC' },
      relations: ['kpis', 'person'],
    })

    availableDashboardTemplates.value = response.data || []
  }
  // #endregion

  // #region Helpers
  /**
   * Keeps the active tab within the currently available dashboard range.
   */
  function syncActiveTab() {
    if (!dashboards.value.length) {
      activeTab.value = 0
      return
    }

    activeTab.value = Math.min(Math.max(activeTab.value, 0), dashboards.value.length - 1)
  }

  /**
   * Closes the delete dialog and clears the selected dashboard reference.
   */
  function cancelDashboardDelete() {
    dashboardDeleteDialog.value = false
    dashboardToDelete.value = null
  }

  /**
   * Updates the favorites drawer state through a single composable-owned state source.
   */
  function setFavoritesDrawer(value: boolean) {
    favoritesDrawer.value = value
  }

  /**
   * Extracts stable KPI handles from template relations for direct dashboard creation.
   */
  function getKpiHandles(source: KpiRelationSource): number[] {
    if (!Array.isArray(source.kpis)) {
      return []
    }

    return [
      ...new Set(
        source.kpis
          .map((kpi) => {
            if (typeof kpi === 'number') {
              return kpi
            }

            if (kpi && typeof kpi === 'object' && typeof kpi.handle === 'number') {
              return kpi.handle
            }

            return null
          })
          .filter((handle): handle is number => handle !== null),
      ),
    ]
  }

  /**
   * Persists KPI relations for a newly created dashboard through the generic reference endpoint.
   */
  async function createDashboardKpiReferences(
    dashboardHandle: NonNullable<DashboardItem['handle']>,
    kpiHandles: number[],
  ) {
    for (const kpiHandle of kpiHandles) {
      await ApiGenericService.createReference('dashboard', 'kpis', dashboardHandle, kpiHandle)
    }
  }

  /**
   * Persists KPI relations for a newly created dashboard template.
   */
  async function createDashboardTemplateKpiReferences(
    dashboardTemplateHandle: NonNullable<DashboardTemplateItem['handle']>,
    kpiHandles: number[],
  ) {
    for (const kpiHandle of kpiHandles) {
      await ApiGenericService.createReference(
        'dashboardTemplate',
        'kpis',
        dashboardTemplateHandle,
        kpiHandle,
      )
    }
  }
  // #endregion

  // #region Dialogs
  /**
   * Opens the dashboard creation dialog, optionally prefilled from a template.
   */
  function openDashboardDialog(item: DashboardItem | null = null) {
    dashboardDialog.value = { visible: true, mode: 'create', item }
  }

  /**
   * Closes the dashboard creation dialog.
   */
  function closeDashboardDialog() {
    dashboardDialog.value = { visible: false, mode: 'create', item: null }
  }

  /**
   * Opens the template creation dialog for the current dashboard.
   */
  function openDashboardTemplateSaveDialog() {
    if (!currentDashboard.value || !currentPersonStore.person) {
      return
    }

    dashboardTemplateDialog.value = {
      visible: true,
      mode: 'create',
      item: {
        name: currentDashboard.value.name,
        description: '',
        isShared: false,
        person: currentPersonStore.person,
        kpis: currentDashboard.value.kpis ?? [],
      },
    }
  }

  /**
   * Closes the template creation dialog.
   */
  function closeDashboardTemplateDialog() {
    dashboardTemplateDialog.value = { visible: false, mode: 'create', item: null }
  }

  /**
   * Opens the template picker dialog and refreshes templates beforehand.
   */
  async function openDashboardTemplateLoadDialog() {
    await loadAvailableDashboardTemplates()
    dashboardTemplateLoadDialog.value = true
  }

  function updateDashboardDialogVisibility(value: boolean) {
    dashboardDialog.value = { ...dashboardDialog.value, visible: value }
  }

  function updateDashboardDialogMode(value: EditDialogOptions['mode']) {
    dashboardDialog.value = { ...dashboardDialog.value, mode: value }
  }

  function updateDashboardDialogItem(value: SaplingGenericItem | null) {
    dashboardDialog.value = { ...dashboardDialog.value, item: value as DashboardItem | null }
  }

  function updateDashboardTemplateDialogVisibility(value: boolean) {
    dashboardTemplateDialog.value = { ...dashboardTemplateDialog.value, visible: value }
  }

  function updateDashboardTemplateDialogMode(value: EditDialogOptions['mode']) {
    dashboardTemplateDialog.value = { ...dashboardTemplateDialog.value, mode: value }
  }

  function updateDashboardTemplateDialogItem(value: SaplingGenericItem | null) {
    dashboardTemplateDialog.value = {
      ...dashboardTemplateDialog.value,
      item: value as DashboardTemplateItem | null,
    }
  }

  function updateDashboardTemplateLoadDialogVisibility(value: boolean) {
    dashboardTemplateLoadDialog.value = value
  }
  // #endregion

  // #region CRUD
  /**
   * Deletes the selected dashboard and updates the tab selection afterwards.
   */
  async function confirmDashboardDelete() {
    if (!dashboardToDelete.value || dashboardToDelete.value.handle == null) {
      cancelDashboardDelete()
      return
    }

    await ApiGenericService.delete('dashboard', dashboardToDelete.value.handle)

    const idx = dashboards.value.findIndex(
      (dashboard) => dashboard.handle === dashboardToDelete.value?.handle,
    )
    if (idx !== -1) {
      dashboards.value.splice(idx, 1)
    }

    syncActiveTab()
    cancelDashboardDelete()
  }

  /**
   * Persists a dashboard and keeps the dashboard list in sync afterwards.
   */
  async function onDashboardSave(form: DashboardForm, action: DialogSaveAction) {
    if (!currentPersonStore.person?.handle) return

    const { kpis: _kpis, ...formWithoutKpis } = form
    let dashboard: DashboardItem

    if (dashboardDialog.value.mode === 'edit' && dashboardDialog.value.item?.handle != null) {
      dashboard = await ApiGenericService.update<DashboardItem>(
        'dashboard',
        dashboardDialog.value.item.handle,
        {
          ...formWithoutKpis,
          person: currentPersonStore.person.handle,
        },
      )
    } else {
      dashboard = await ApiGenericService.create<DashboardItem>('dashboard', {
        ...formWithoutKpis,
        person: currentPersonStore.person.handle,
      })
    }

    await loadDashboards()

    const dashboardIndex = dashboards.value.findIndex((entry) => entry.handle === dashboard.handle)
    if (dashboardIndex !== -1) {
      activeTab.value = dashboardIndex
    }

    if (action === 'saveAndClose') {
      closeDashboardDialog()
      return
    }

    dashboardDialog.value = {
      visible: true,
      mode: 'edit',
      item: dashboardIndex !== -1 ? dashboards.value[dashboardIndex] : dashboard,
    }
  }

  /**
   * Persists the current dashboard as a reusable template.
   */
  async function onDashboardTemplateSave(form: DashboardForm) {
    if (!currentPersonStore.person?.handle) {
      return
    }

    const { kpis: _kpis, ...formWithoutKpis } = form
    const dashboardTemplate = await ApiGenericService.create<DashboardTemplateItem>('dashboardTemplate', {
      ...formWithoutKpis,
      person: currentPersonStore.person.handle,
    })

    if (dashboardTemplate.handle != null) {
      await createDashboardTemplateKpiReferences(dashboardTemplate.handle, getKpiHandles(form))
    }

    await loadAvailableDashboardTemplates()
    closeDashboardTemplateDialog()
    pushMessage(
      'success',
      'global.recordSaved',
      'global.recordSavedDescription',
      'dashboardTemplate',
    )
  }

  /**
   * Opens the delete flow for the provided dashboard handle when more than one dashboard exists.
   */
  function removeDashboard(handle: NonNullable<DashboardItem['handle']>) {
    if (!isDashboardRemovable.value) {
      return
    }

    dashboardToDelete.value =
      dashboards.value.find((dashboard) => dashboard.handle === handle) || null
    dashboardDeleteDialog.value = dashboardToDelete.value !== null
  }

  /**
   * Creates a personal dashboard directly from the selected template including its KPIs.
   */
  async function loadDashboardFromTemplate(template: DashboardTemplateItem) {
    if (!currentPersonStore.person?.handle || template.handle == null) {
      return
    }

    applyingDashboardTemplateHandle.value = template.handle

    try {
      const dashboard = await ApiGenericService.create<DashboardItem>('dashboard', {
        name: template.name,
        person: currentPersonStore.person.handle,
      })

      if (dashboard.handle != null) {
        const templateKpis = getKpiHandles(template)
        await createDashboardKpiReferences(dashboard.handle, templateKpis)
      }

      await loadDashboards()

      const dashboardIndex = dashboards.value.findIndex((entry) => entry.handle === dashboard.handle)
      if (dashboardIndex !== -1) {
        activeTab.value = dashboardIndex
      }

      dashboardTemplateLoadDialog.value = false
      pushMessage('success', 'global.recordSaved', 'global.recordSavedDescription', 'dashboard')
    } finally {
      applyingDashboardTemplateHandle.value = null
    }
  }
  // #endregion

  // #region UI Actions
  /**
   * Opens the favorites drawer from the dashboard shell.
   */
  async function openFavoritesDrawer() {
    if (!(await ensureFavoritesAccess())) {
      setFavoritesDrawer(false)
      return
    }

    setFavoritesDrawer(true)
  }

  /**
   * Replaces the KPI collection for a single dashboard without reloading all dashboard data.
   */
  function updateDashboardKpis(
    dashboardHandle: DashboardItem['handle'],
    kpis: DashboardItem['kpis'],
  ) {
    const dashboardIndex = dashboards.value.findIndex(
      (dashboard) => dashboard.handle === dashboardHandle,
    )

    if (dashboardIndex === -1) {
      return
    }

    dashboards.value[dashboardIndex] = {
      ...dashboards.value[dashboardIndex],
      kpis: Array.isArray(kpis) ? [...kpis] : [],
    }
  }
  // #endregion

  // #region Return
  return {
    dashboardDeleteDialog,
    dashboardToDelete,
    dashboardDialog,
    dashboardTemplateDialog,
    dashboardTemplateLoadDialog,
    applyingDashboardTemplateHandle,
    dashboardEntity,
    dashboardEntityTemplates,
    dashboardTemplateEntity,
    dashboardTemplateEntityTemplates,
    availableDashboardTemplates,
    isLoading,
    dashboards,
    activeTab,
    favoritesDrawer,
    currentPersonStore,
    currentDashboard,
    hasDashboards,
    isDashboardRemovable,
    hasFavoritesAccess,
    cancelDashboardDelete,
    closeDashboardDialog,
    closeDashboardTemplateDialog,
    openDashboardDialog,
    openDashboardTemplateLoadDialog,
    openDashboardTemplateSaveDialog,
    updateDashboardDialogVisibility,
    updateDashboardDialogMode,
    updateDashboardDialogItem,
    updateDashboardTemplateDialogVisibility,
    updateDashboardTemplateDialogMode,
    updateDashboardTemplateDialogItem,
    updateDashboardTemplateLoadDialogVisibility,
    openFavoritesDrawer,
    confirmDashboardDelete,
    loadDashboardFromTemplate,
    onDashboardSave,
    onDashboardTemplateSave,
    removeDashboard,
    setFavoritesDrawer,
    updateDashboardKpis,
    loadDashboards,
    loadDashboardEntity,
    loadDashboardEntityTemplates,
    loadDashboardTemplateEntity,
    loadDashboardTemplateEntityTemplates,
    loadAvailableDashboardTemplates,
  }
  // #endregion
}
