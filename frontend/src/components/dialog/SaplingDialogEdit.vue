<template>
  <v-dialog
    :model-value="modelValue"
    class="sapling-dialog-edit-dialog"
    @update:model-value="handleDialogUpdate"
    min-width="95vw"
    min-height="95vh"
    max-width="95vw"
    max-height="95vh"
    persistent
  >
    <v-card class="glass-panel sapling-dialog-edit-card" elevation="12">
      <div class="sapling-dialog-edit-shell">
        <v-card-title class="sapling-dialog-edit-header">
          <SaplingDialogEditHero :loading="isLoading" :eyebrow="entityLabel" :title="dialogTitle">
            <template #timestamps>
              <v-chip
                v-if="createdAtLabel"
                size="small"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-calendar-plus-outline"
              >
                {{ createdAtTitle }}: {{ createdAtLabel }}
              </v-chip>
              <v-chip
                v-if="updatedAtLabel"
                size="small"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-calendar-edit-outline"
              >
                {{ updatedAtTitle }}: {{ updatedAtLabel }}
              </v-chip>
            </template>

            <template #meta>
              <v-chip
                v-if="isDirty && mode !== 'readonly'"
                size="small"
                color="warning"
                variant="tonal"
                prepend-icon="mdi-pencil"
              >
                {{ dirtySummaryLabel }}
              </v-chip>
              <v-chip size="small" variant="outlined" prepend-icon="mdi-form-dropdown">
                {{ visibleTemplates.length }}
              </v-chip>
              <v-chip
                v-if="mode === 'edit'"
                size="small"
                variant="outlined"
                prepend-icon="mdi-link-variant"
              >
                {{ relationTemplates.length }}
              </v-chip>
              <v-chip
                v-if="itemHandleLabel"
                size="small"
                variant="outlined"
                prepend-icon="mdi-pound"
              >
                {{ itemHandleLabel }}
              </v-chip>
            </template>
          </SaplingDialogEditHero>
        </v-card-title>
        <v-card-text class="sapling-dialog-edit-content">
          <template v-if="isLoading">
            <div class="sapling-dialog-edit-loading">
              <v-skeleton-loader
                class="sapling-dialog-edit-loading__tabs"
                elevation="12"
                type="heading"
              />
              <v-skeleton-loader class="sapling-dialog-edit-skeleton" elevation="12" type="table" />
            </div>
          </template>
          <template v-else>
            <div class="sapling-dialog-edit-tabs-shell">
              <v-tabs v-model="activeTab" class="sapling-dialog-edit-tabs" grow>
                <v-tab class="sapling-dialog-edit-tab">
                  {{ entityLabel }}
                </v-tab>
                <template v-if="mode === 'edit'">
                  <v-tab
                    v-for="template in relationTemplates"
                    :key="template.name"
                    class="sapling-dialog-edit-tab"
                  >
                    {{ $t(`${entity?.handle}.${template.name}`) }}
                  </v-tab>
                </template>
              </v-tabs>
            </div>
            <v-window v-model="activeTab" class="sapling-dialog-edit-window">
              <v-window-item :value="0" class="sapling-dialog-edit-window-item">
                <div class="sapling-dialog-edit-tab-scroll">
                  <div class="sapling-dialog-edit-form-surface">
                    <v-form ref="formRef" class="sapling-dialog-edit-form" @submit.prevent="save">
                      <div class="sapling-dialog-edit-form-layout">
                        <section
                          v-for="group in visibleTemplateGroups"
                          :key="group.id"
                          class="sapling-dialog-edit-section"
                          :class="{
                            'sapling-dialog-edit-section--collapsed':
                              group.label && !isGroupExpanded(group.id),
                            'sapling-dialog-edit-section--dirty':
                              mode !== 'readonly' && isGroupDirty(group.templates),
                          }"
                        >
                          <div v-if="group.label" class="sapling-dialog-edit-section__header">
                            <button
                              type="button"
                              class="sapling-dialog-edit-section__toggle"
                              :aria-expanded="isGroupExpanded(group.id)"
                              @click="toggleGroup(group.id)"
                            >
                              <h3 class="sapling-dialog-edit-section__title">
                                {{ $t(group.label) }}
                              </h3>
                              <v-icon
                                :icon="
                                  isGroupExpanded(group.id) ? 'mdi-chevron-up' : 'mdi-chevron-down'
                                "
                                size="20"
                              />
                            </button>
                          </div>
                          <v-expand-transition>
                            <div
                              v-show="!group.label || isGroupExpanded(group.id)"
                              class="sapling-dialog-edit-section__body"
                            >
                              <v-row density="comfortable" class="sapling-dialog-edit-grid">
                                <v-col
                                  v-for="template in group.templates"
                                  :key="template.name"
                                  v-bind="getTemplateColumnProps(template)"
                                  class="sapling-dialog-edit-grid__column"
                                >
                                  <div
                                    class="sapling-dialog-edit-field-shell"
                                    :class="{
                                      'sapling-dialog-edit-field-shell--dirty':
                                        mode !== 'readonly' && isTemplateDirty(template),
                                    }"
                                  >
                                    <SaplingDialogEditFieldRenderer
                                      :template="template"
                                      :entity-handle="entity?.handle ?? ''"
                                      :item-handle="item?.handle ?? undefined"
                                      :mode="mode"
                                      :form-values="form"
                                      :visible-templates="visibleTemplates"
                                      :permissions="permissions"
                                      :icon-names="iconNames"
                                      :is-reference-visible="isReferenceVisible"
                                      :rules="getRules(template)"
                                      :field-disabled="isFieldDisabled(template)"
                                      :reference-field-disabled="isReferenceFieldDisabled(template)"
                                      :reference-parent-filter="
                                        template.referenceDependency
                                          ? getReferenceParentFilter(template)
                                          : undefined
                                      "
                                      @update-field="updateFormField"
                                      @select-record="onDuplicateSelect"
                                    />
                                  </div>
                                </v-col>
                              </v-row>
                            </div>
                          </v-expand-transition>
                        </section>
                      </div>
                    </v-form>
                  </div>
                </div>
              </v-window-item>
              <v-window-item
                v-for="(template, idx) in relationTemplates"
                :key="template.name"
                :value="idx + 1"
                class="sapling-dialog-edit-window-item"
              >
                <SaplingDialogEditRelationTab
                  :template="template"
                  :entity-handle="entity?.handle ?? ''"
                  :entity-label="entityLabel"
                  :item="item"
                  :entity="entity"
                  :headers="relationTableHeaders[template.name] ?? []"
                  :items="relationTableItems[template.name] ?? []"
                  :search="relationTableSearch[template.name] || ''"
                  :page="relationTablePage[template.name] || 1"
                  :items-per-page="
                    relationTableItemsPerPage[template.name] || DEFAULT_PAGE_SIZE_SMALL
                  "
                  :total-items="relationTableTotal[template.name] ?? 0"
                  :is-loading="relationTableState[template.name]?.isLoading ?? false"
                  :sort-by="relationTableSortBy[template.name] || []"
                  :column-filters="relationTableColumnFilters[template.name] || {}"
                  :entity-templates="relationTableState[template.name]?.entityTemplates ?? []"
                  :relation-entity="relationTableState[template.name]?.entity ?? null"
                  :entity-permission="relationTableState[template.name]?.entityPermission ?? null"
                  :selected-relations="selectedRelations[template.name] ?? []"
                  :selected-items="selectedItems ?? []"
                  @update:selected-relations="
                    (val) => updateSelectedRelationItems(template.name, val)
                  "
                  @update:selected-items="updateSelectedRelationTableItems"
                  @add-relation="addRelation(template)"
                  @remove-relation="removeRelation(template, selectedItems)"
                  @update:search="(val) => onRelationSearch(template.name, val)"
                  @update:page="(val) => onRelationTablePage(template.name, val)"
                  @update:items-per-page="(val) => onRelationTableItemsPerPage(template.name, val)"
                  @update:sort-by="(val) => onRelationTableSort(template.name, val)"
                  @update:column-filters="(val) => onRelationTableColumnFilters(template.name, val)"
                  @reload="onRelationTableReload(template.name)"
                />
              </v-window-item>
            </v-window>
          </template>
        </v-card-text>
        <div v-if="isLoading" class="sapling-dialog__footer">
          <v-card-actions class="sapling-dialog__actions">
            <v-btn text prepend-icon="mdi-close" @click="cancel">
              <template v-if="$vuetify.display.mdAndUp"></template>
            </v-btn>
            <v-spacer />
            <v-btn
              v-if="mode !== 'readonly'"
              color="primary"
              append-icon="mdi-content-save"
              disabled
            >
              <template v-if="$vuetify.display.mdAndUp"></template>
            </v-btn>
          </v-card-actions>
        </div>
        <SaplingActionClose v-else-if="mode == 'readonly'" :close="cancel" />
        <SaplingActionSave
          v-else
          :cancel="cancel"
          :reset="resetForm"
          :reset-disabled="!isDirty"
          :reset-label="resetButtonLabel"
          :save="save"
          :save-and-close="saveAndClose"
          :save-disabled="!isDirty"
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DialogSaveAction, DialogState, EntityTemplate } from '@/entity/structure'
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import SaplingActionClose from '../actions/SaplingActionClose.vue'
import { useSaplingDialogEdit } from '@/composables/dialog/useSaplingDialogEdit'
import SaplingActionSave from '../actions/SaplingActionSave.vue'
import SaplingDialogEditHero from '@/components/common/SaplingDialogEditHero.vue'
import SaplingDialogEditFieldRenderer from './SaplingDialogEditFieldRenderer.vue'
import SaplingDialogEditRelationTab from './SaplingDialogEditRelationTab.vue'
// #endregion

// #region Props & Emits
const props = defineProps<{
  modelValue: boolean
  mode: DialogState
  item: SaplingGenericItem | null
  parent?: SaplingGenericItem | null
  parentEntity?: EntityItem | null
  templates: EntityTemplate[]
  entity: EntityItem | null
  showReference?: boolean
  forceDirty?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  // The edit dialog emits entity-specific payloads that vary by template.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event: 'save', value: any, action: DialogSaveAction): void
  (event: 'cancel'): void
  (event: 'update:mode', value: DialogState): void
  (event: 'update:item', value: SaplingGenericItem | null): void
}>()
// #endregion

const { t, d, te, locale } = useI18n()

// #region Composable
const {
  isLoading,
  form,
  formRef,
  activeTab,
  selectedRelations,
  visibleTemplates,
  visibleTemplateGroups,
  relationTemplates,
  relationTableHeaders,
  relationTableState,
  relationTableItems,
  relationTableSearch,
  relationTablePage,
  relationTableTotal,
  relationTableItemsPerPage,
  relationTableSortBy,
  relationTableColumnFilters,
  permissions,
  iconNames,
  selectedItems,
  isDirty,
  dirtyFieldCount,
  getRules,
  getTemplateColumnProps,
  isTemplateDirty,
  getDirtyTemplateCount,
  isFieldDisabled,
  isReferenceFieldDisabled,
  getReferenceParentFilter,
  handleDialogUpdate,
  onDuplicateSelect,
  cancel,
  resetForm,
  save,
  saveAndClose,
  addRelation,
  removeRelation,
  onRelationTablePage,
  onRelationTableItemsPerPage,
  onRelationTableSort,
  onRelationTableColumnFilters,
  onRelationTableReload,
} = useSaplingDialogEdit(props, emit, { forceDirty: props.forceDirty })

function getFallbackCopy(german: string, english: string): string {
  return String(locale.value).toLowerCase().startsWith('de') ? german : english
}

const entityLabel = computed(() =>
  props.entity?.handle ? t(`navigation.${props.entity.handle}`) : '',
)

const isReferenceVisible = computed(() => props.showReference !== false)

const dialogTitle = computed(() => {
  switch (props.mode) {
    case 'create':
      return t('global.createRecord')
    case 'edit':
      return t('global.editRecord')
    default:
      return entityLabel.value
  }
})

const itemHandleLabel = computed(() =>
  props.item?.handle == null ? '' : String(props.item.handle),
)

function getTimestampTitle(field: 'createdAt' | 'updatedAt', fallback: string): string {
  const entityHandle = props.entity?.handle
  const entityKey = entityHandle ? `${entityHandle}.${field}` : ''

  if (entityKey && te(entityKey)) {
    return t(entityKey)
  }

  return t(fallback)
}

function formatTimestamp(value: unknown): string {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : d(date)
}

const createdAtTitle = computed(() => getTimestampTitle('createdAt', 'global.createdAt'))
const updatedAtTitle = computed(() => getTimestampTitle('updatedAt', 'global.updatedAt'))
const createdAtLabel = computed(() => formatTimestamp(props.item?.createdAt))
const updatedAtLabel = computed(() => formatTimestamp(props.item?.updatedAt))

const resetButtonLabel = computed(() =>
  te('filter.reset') ? t('filter.reset') : getFallbackCopy('Zuruecksetzen', 'Reset'),
)

const dirtySummaryLabel = computed(() => {
  if (dirtyFieldCount.value <= 0) {
    return ''
  }

  return getFallbackCopy(
    dirtyFieldCount.value === 1 ? '1 Feld geaendert' : `${dirtyFieldCount.value} Felder geaendert`,
    dirtyFieldCount.value === 1 ? '1 field changed' : `${dirtyFieldCount.value} fields changed`,
  )
})

const expandedGroupIds = ref<string[]>([])

function syncExpandedGroups(forceOpenAll = false): void {
  const groupIds = visibleTemplateGroups.value.map((group) => group.id)

  if (forceOpenAll) {
    expandedGroupIds.value = groupIds
    return
  }

  const expandedGroupSet = new Set(expandedGroupIds.value)
  groupIds.forEach((groupId) => expandedGroupSet.add(groupId))
  expandedGroupIds.value = groupIds.filter((groupId) => expandedGroupSet.has(groupId))
}

function isGroupExpanded(groupId: string): boolean {
  return expandedGroupIds.value.includes(groupId)
}

function toggleGroup(groupId: string): void {
  if (isGroupExpanded(groupId)) {
    expandedGroupIds.value = expandedGroupIds.value.filter((id) => id !== groupId)
    return
  }

  expandedGroupIds.value = [...expandedGroupIds.value, groupId]
}

function isGroupDirty(templates: EntityTemplate[]): boolean {
  return getDirtyTemplateCount(templates) > 0
}

function updateFormField(key: string, value: unknown): void {
  form.value[key] = value
}

function updateSelectedRelationItems(templateName: string, items: SaplingGenericItem[]): void {
  selectedRelations.value[templateName] = items
}

function updateSelectedRelationTableItems(items: SaplingGenericItem[]): void {
  selectedItems.value = items
}

function onRelationSearch(templateName: string, search: string): void {
  relationTableSearch.value[templateName] = search
  relationTablePage.value[templateName] = 1
  onRelationTablePage(templateName, 1)
}

watch(visibleTemplateGroups, () => syncExpandedGroups(), { immediate: true })

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      syncExpandedGroups(true)
    }
  },
)
// #endregion
</script>
