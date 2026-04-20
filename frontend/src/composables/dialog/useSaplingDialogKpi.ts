// #region Imports
import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { KPIItem } from '@/entity/entity'
// #endregion

// #region Types
type VuetifyFormValidationResult = boolean | { valid: boolean } | undefined

type VuetifyFormRef = {
  validate: () => Promise<VuetifyFormValidationResult>
}

type SaplingDialogKpiEmit = {
  (event: 'update:addKpiDialog', value: boolean): void
  (event: 'update:selectedKpi', value: KPIItem | null): void
}

interface UseSaplingDialogKpiOptions {
  closeDialog: () => void
  validateAndAddKpi: () => void | Promise<void>
}
// #endregion

/**
 * Provides the interaction layer for the KPI selection dialog while keeping
 * the persistence workflow in the dashboard composable.
 */
export function useSaplingDialogKpi(
  emit: SaplingDialogKpiEmit,
  options: UseSaplingDialogKpiOptions,
) {
  // #region State
  const { t } = useI18n()
  const formRef: Ref<VuetifyFormRef | null> = ref(null)
  // #endregion

  // #region Rules
  const kpiRules = [
    (value: KPIItem | null | undefined) =>
      value != null || `${t('navigation.kpi')} ${t('global.isRequired')}`,
  ]
  // #endregion

  // #region Methods
  /**
   * Normalizes Vuetify form validation results across supported return shapes.
   */
  function isFormValid(result: VuetifyFormValidationResult): boolean {
    if (typeof result === 'boolean') {
      return result
    }

    return result?.valid === true
  }

  /**
   * Synchronizes the dialog visibility with the parent state.
   */
  function handleDialogUpdate(value: boolean): void {
    emit('update:addKpiDialog', value)
  }

  /**
   * Synchronizes the selected KPI object.
   */
  function handleSelectedKpiUpdate(value: KPIItem | null): void {
    emit('update:selectedKpi', value)
  }

  /**
   * Delegates the cancel flow to the dashboard composable.
   */
  function handleCancel(): void {
    options.closeDialog()
  }

  /**
   * Delegates the validated save flow to the dashboard composable.
   */
  async function handleSave(): Promise<void> {
    const validationResult = await formRef.value?.validate()

    if (!isFormValid(validationResult)) {
      return
    }

    await options.validateAndAddKpi()
  }
  // #endregion

  // #region Return
  return {
    formRef,
    kpiRules,
    handleDialogUpdate,
    handleSelectedKpiUpdate,
    handleCancel,
    handleSave,
  }
  // #endregion
}
