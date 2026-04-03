// #region Imports
import { ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { EntityItem } from '@/entity/entity';
// #endregion

// #region Types
type VuetifyFormValidationResult = boolean | { valid: boolean } | undefined;

type VuetifyFormRef = {
  validate: () => Promise<VuetifyFormValidationResult>;
};

type SaplingDialogFavoriteEmit = {
  (event: 'update:addFavoriteDialog', value: boolean): void;
  (event: 'update:newFavoriteTitle', value: string): void;
  (event: 'update:selectedFavoriteEntity', value: EntityItem | null): void;
  (event: 'addFavorite'): void;
};
// #endregion

/**
 * Provides the state-independent interaction contract for the favorite dialog.
 */
export function useSaplingDialogFavorite(emit: SaplingDialogFavoriteEmit) {
  // #region State
  const { t } = useI18n();
  const formRef: Ref<VuetifyFormRef | null> = ref(null);
  // #endregion

  // #region Rules
  const titleRules = [
    (value: unknown) => {
      const normalizedValue = typeof value === 'string' ? value.trim() : value;
      return Boolean(normalizedValue) || `${t('favorite.title')} ${t('global.isRequired')}`;
    },
  ];

  const entityRules = [
    (value: EntityItem | null | undefined) => value != null || `${t('navigation.entity')} ${t('global.isRequired')}`,
  ];
  // #endregion

  // #region Methods
  /**
   * Normalizes Vuetify form validation results across supported return shapes.
   */
  function isFormValid(result: VuetifyFormValidationResult): boolean {
    if (typeof result === 'boolean') {
      return result;
    }

    return result?.valid === true;
  }

  /**
   * Synchronizes the dialog visibility with the parent state.
   */
  function handleDialogUpdate(value: boolean): void {
    emit('update:addFavoriteDialog', value);
  }

  /**
   * Synchronizes the favorite title input.
   */
  function handleFavoriteTitleUpdate(value: string): void {
    emit('update:newFavoriteTitle', value);
  }

  /**
   * Synchronizes the selected entity.
   */
  function handleSelectedFavoriteEntityUpdate(value: EntityItem | null): void {
    emit('update:selectedFavoriteEntity', value);
  }

  /**
   * Closes the dialog without triggering persistence.
   */
  function handleCancel(): void {
    emit('update:addFavoriteDialog', false);
  }

  /**
   * Validates the dialog form before forwarding the save intent.
   */
  async function handleSave(): Promise<void> {
    const validationResult = await formRef.value?.validate();

    if (!isFormValid(validationResult)) {
      return;
    }

    emit('addFavorite');
  }
  // #endregion

  // #region Return
  return {
    formRef,
    titleRules,
    entityRules,
    handleDialogUpdate,
    handleFavoriteTitleUpdate,
    handleSelectedFavoriteEntityUpdate,
    handleCancel,
    handleSave,
  };
  // #endregion
}