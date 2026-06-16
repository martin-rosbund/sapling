import type { KPIItem } from '@/entity/entity'
import { buildKpiEntityPath, getKpiTargetEntityHandle } from '@/utils/saplingKpiNavigation'
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import ApiKpiService from '@/services/api.kpi.service'
import { useSaplingKpiLoader } from '@/composables/kpi/useSaplingKpiLoader'
import { useRouter } from 'vue-router'
import { pushAppRoute } from '@/utils/routerNavigation'

function isKpiListRow(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Loads and exposes table rows for list KPIs including entity navigation helpers.
 */
export function useSaplingKpiList(kpi: MaybeRefOrGetter<KPIItem | null | undefined>) {
  //#region State
  const router = useRouter()
  const rows = ref<Array<Record<string, unknown>>>([])
  const columns = ref<string[]>([])
  const hasData = computed(() => rows.value.length > 0 && columns.value.length > 0)
  const canOpenEntity = computed(() =>
    Boolean(getKpiTargetEntityHandle(toValue(kpi)?.targetEntity)),
  )
  //#endregion

  //#region Methods
  function resetRows() {
    rows.value = []
    columns.value = []
  }

  const { loading, hasError, isLoaded, loadKpiValue } = useSaplingKpiLoader(kpi, {
    load: async (currentKpi) => {
      const result = await ApiKpiService.execute<Array<Record<string, unknown>>>(currentKpi.handle)
      const nextRows = Array.isArray(result?.value) ? result.value.filter(isKpiListRow) : []

      rows.value = nextRows
      columns.value = nextRows.length > 0 ? Object.keys(nextRows[0]) : []
    },
    reset: resetRows,
  })

  async function openEntity(row: Record<string, unknown>) {
    const path = buildKpiEntityPath(toValue(kpi) ?? null, row)
    if (!path) {
      return
    }

    await pushAppRoute(router, path)
  }
  //#endregion

  //#region Return
  return {
    rows,
    columns,
    loading,
    hasError,
    isLoaded,
    hasData,
    canOpenEntity,
    openEntity,
    loadKpiValue,
  }
  //#endregion
}
