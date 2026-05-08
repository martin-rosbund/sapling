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
        <SaplingActionBar v-else-if="mode === 'readonly'">
          <template #leading>
            <v-btn variant="text" prepend-icon="mdi-close" @click="cancel">
              <template v-if="$vuetify.display.mdAndUp">{{ $t('global.close') }}</template>
            </v-btn>
          </template>

          <template #trailing>
            <v-menu v-if="recordActionMenuItems.length > 0">
              <template #activator="{ props: menuProps }">
                <v-btn
                  variant="text"
                  prepend-icon="mdi-dots-horizontal-circle-outline"
                  v-bind="menuProps"
                  :disabled="recordActionButtonsDisabled"
                >
                  <template v-if="$vuetify.display.mdAndUp">{{ $t('global.more') }}</template>
                </v-btn>
              </template>

              <v-list density="comfortable" min-width="260">
                <v-list-item
                  v-for="menuItem in recordActionMenuItems"
                  :key="`${menuItem.type}-${menuItem.title ?? menuItem.titleKey ?? menuItem.scriptButton?.name ?? ''}`"
                  :prepend-icon="menuItem.icon"
                  :title="getRecordActionTitle(menuItem)"
                  @click="handleRecordAction(menuItem)"
                />
              </v-list>
            </v-menu>

            <v-btn
              v-if="canDeleteRecord"
              variant="text"
              color="error"
              prepend-icon="mdi-delete-outline"
              :disabled="recordActionButtonsDisabled"
              @click="openRecordDeleteDialog"
            >
              <template v-if="$vuetify.display.mdAndUp">{{ $t('global.delete') }}</template>
            </v-btn>
          </template>
        </SaplingActionBar>
        <SaplingActionBar v-else>
          <template #leading>
            <v-btn variant="text" prepend-icon="mdi-close" :disabled="isSaving" @click="cancel">
              <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
            </v-btn>
          </template>

          <template #trailing>
            <v-menu v-if="recordActionMenuItems.length > 0">
              <template #activator="{ props: menuProps }">
                <v-btn
                  variant="text"
                  prepend-icon="mdi-dots-horizontal-circle-outline"
                  v-bind="menuProps"
                  :disabled="recordActionButtonsDisabled"
                >
                  <template v-if="$vuetify.display.mdAndUp">{{ $t('global.more') }}</template>
                </v-btn>
              </template>

              <v-list density="comfortable" min-width="260">
                <v-list-item
                  v-for="menuItem in recordActionMenuItems"
                  :key="`${menuItem.type}-${menuItem.title ?? menuItem.titleKey ?? menuItem.scriptButton?.name ?? ''}`"
                  :prepend-icon="menuItem.icon"
                  :title="getRecordActionTitle(menuItem)"
                  @click="handleRecordAction(menuItem)"
                />
              </v-list>
            </v-menu>

            <v-btn
              v-if="canDeleteRecord"
              variant="text"
              color="error"
              prepend-icon="mdi-delete-outline"
              :disabled="recordActionButtonsDisabled"
              @click="openRecordDeleteDialog"
            >
              <template v-if="$vuetify.display.mdAndUp">{{ $t('global.delete') }}</template>
            </v-btn>

            <v-btn
              variant="text"
              prepend-icon="mdi-restore"
              :disabled="!isDirty || isSaving"
              @click="resetForm"
            >
              <template v-if="$vuetify.display.mdAndUp">{{ resetButtonLabel }}</template>
            </v-btn>
            <v-btn
              color="primary"
              append-icon="mdi-content-save"
              :disabled="!isDirty || isSaving"
              :loading="pendingSaveAction === 'save'"
              @click="save"
            >
              <template v-if="$vuetify.display.mdAndUp">{{ $t('global.save') }}</template>
            </v-btn>
            <v-btn
              color="primary"
              variant="tonal"
              append-icon="mdi-content-save-check"
              :disabled="!isDirty || isSaving"
              :loading="pendingSaveAction === 'saveAndClose'"
              @click="saveAndClose"
            >
              <template v-if="$vuetify.display.mdAndUp">{{ $t('global.saveAndClose') }}</template>
            </v-btn>
          </template>
        </SaplingActionBar>
      </div>
    </v-card>
  </v-dialog>

  <SaplingDialogDelete
    persistent
    :model-value="recordDeleteDialog"
    :item="item"
    @update:model-value="recordDeleteDialog = $event"
    @confirm="confirmRecordDelete"
    @cancel="closeRecordDeleteDialog"
  />

  <SaplingTableRowUpload
    v-if="showUploadDialog"
    :show="showUploadDialog"
    :item="item"
    :entityHandle="entityHandle"
    @close="closeUploadDialog"
    @uploaded="closeUploadDialog"
  />

  <SaplingTableRowInformation
    v-if="showInformationDialog"
    :show="showInformationDialog"
    :item="item"
    :entityHandle="entityHandle"
    @close="closeInformationDialog"
    @saved="closeInformationDialog"
  />

  <v-dialog
    :model-value="unsavedChangesDialog"
    class="sapling-dialog-medium"
    persistent
    @update:model-value="handleUnsavedChangesDialogUpdate"
  >
    <v-card class="glass-panel" elevation="12">
      <div class="sapling-dialog-shell">
        <SaplingDialogHero
          :eyebrow="$t('global.unsavedChanges')"
          :title="$t('global.unsavedChanges')"
        />
        <v-card-text class="sapling-dialog__body">
          {{ $t('global.unsavedChangesQuestion') }}
        </v-card-text>

        <div class="sapling-dialog__footer">
          <v-card-actions class="sapling-dialog__actions">
            <v-btn
              variant="text"
              prepend-icon="mdi-pencil"
              :disabled="isSaving"
              @click="keepEditing"
            >
              {{ $t('global.keepEditing') }}
            </v-btn>
            <v-spacer />
            <v-btn
              variant="text"
              color="warning"
              prepend-icon="mdi-delete-outline"
              :disabled="isSaving"
              @click="discardChanges"
            >
              {{ $t('global.discardChanges') }}
            </v-btn>
            <v-btn
              color="primary"
              append-icon="mdi-content-save-check"
              :loading="pendingSaveAction === 'saveAndClose'"
              :disabled="isSaving"
              @click="saveChangesAndClose"
            >
              {{ $t('global.saveAndClose') }}
            </v-btn>
          </v-card-actions>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  AccumulatedPermission,
  DialogSaveAction,
  DialogSaveContext,
  DialogState,
  EntityTemplate,
} from '@/entity/structure'
import { DEFAULT_ENTITY_ITEMS_COUNT, DEFAULT_PAGE_SIZE_SMALL, NAVIGATION_URL } from '@/constants/project.constants'
import type { EntityItem, SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import { useSaplingDialogEdit } from '@/composables/dialog/useSaplingDialogEdit'
import { getSaplingContextMenuTableItems, type SaplingContextMenuTableMenuItem } from '@/composables/context/useSaplingContextMenuTable'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import SaplingDialogEditHero from '@/components/common/SaplingDialogEditHero.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue'
import SaplingDialogEditFieldRenderer from './SaplingDialogEditFieldRenderer.vue'
import SaplingDialogEditRelationTab from './SaplingDialogEditRelationTab.vue'
import SaplingTableRowInformation from '@/components/table/SaplingTableRowInformation.vue'
import SaplingTableRowUpload from '@/components/table/SaplingTableRowUpload.vue'
import ApiGenericService from '@/services/api.generic.service'
import ApiScriptService from '@/services/api.script.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useTimelineDialogStore } from '@/stores/timelineDialogStore'
import { buildTableOrderBy } from '@/utils/saplingTableUtil'
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
  (event: 'save', value: any, action: DialogSaveAction, context: DialogSaveContext): void
  (event: 'cancel'): void
  (event: 'update:mode', value: DialogState): void
  (event: 'update:item', value: SaplingGenericItem | null): void
  (event: 'deleted', value: SaplingGenericItem | null): void
}>()
// #endregion

const { t, d, te, locale } = useI18n()
const { pushMessage } = useSaplingMessageCenter()
const currentPersonStore = useCurrentPersonStore()
const timelineDialogStore = useTimelineDialogStore()

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
  isSaving,
  unsavedChangesDialog,
  pendingSaveAction,
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
  keepEditing,
  discardChanges,
  saveChangesAndClose,
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
} = useSaplingDialogEdit(props, emit, { forceDirty: computed(() => props.forceDirty === true) })

function getFallbackCopy(german: string, english: string): string {
  return String(locale.value).toLowerCase().startsWith('de') ? german : english
}

function handleUnsavedChangesDialogUpdate(value: boolean): void {
  if (!value) {
    keepEditing()
  }
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

const entityHandle = computed(() => props.entity?.handle ?? '')

const entityPermission = computed<AccumulatedPermission | null>(() => {
  if (!props.entity?.handle) {
    return null
  }

  return {
    entityHandle: props.entity.handle,
    allowRead: props.entity.canRead === true,
    allowInsert: props.entity.canInsert === true,
    allowUpdate: props.entity.canUpdate === true,
    allowDelete: props.entity.canDelete === true,
    allowShow: props.entity.canShow === true,
  }
})

const itemHandle = computed<string | number | null>(() => {
  const handle = props.item?.handle
  return typeof handle === 'string' || typeof handle === 'number' ? handle : null
})

const hasPersistedItem = computed(() => itemHandle.value != null)

const canNavigate = computed(() =>
  props.templates.some((template) => template.options?.includes('isNavigation')),
)

const canShowInformation = computed(
  () =>
    permissions.value?.some(
      (permission) => permission.entityHandle === 'information' && permission.allowRead,
    ) ?? false,
)

const canDeleteRecord = computed(
  () => hasPersistedItem.value && Boolean(entityPermission.value?.allowDelete),
)

const recordActionButtonsDisabled = computed(
  () => isSaving.value || (props.mode === 'edit' && isDirty.value),
)

const recordDeleteDialog = ref(false)
const showUploadDialog = ref(false)
const showInformationDialog = ref(false)
const loadedScriptButtons = ref<ScriptButtonItem[]>([])

let scriptButtonsRequestId = 0

const recordActionMenuItems = computed<SaplingContextMenuTableMenuItem[]>(() => {
  if (!hasPersistedItem.value || props.mode === 'create') {
    return []
  }

  return getSaplingContextMenuTableItems({
    canShowInformation: canShowInformation.value,
    entityPermission: entityPermission.value,
    canNavigate: canNavigate.value,
    canTimeline: true,
    scriptButtons: loadedScriptButtons.value,
  }).filter((menuItem) => !['edit', 'show', 'delete'].includes(menuItem.type))
})

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

function getRecordActionTitle(menuItem: SaplingContextMenuTableMenuItem): string {
  if (menuItem.title) {
    return menuItem.title
  }

  if (menuItem.titleKey) {
    const translated = t(menuItem.titleKey)
    return translated !== menuItem.titleKey ? translated : menuItem.titleKey
  }

  return ''
}

function closeUploadDialog(): void {
  showUploadDialog.value = false
}

function closeInformationDialog(): void {
  showInformationDialog.value = false
}

function openRecordDeleteDialog(): void {
  if (!canDeleteRecord.value) {
    return
  }

  recordDeleteDialog.value = true
}

function closeRecordDeleteDialog(): void {
  recordDeleteDialog.value = false
}

function openCopyDialogFromRecord(): void {
  if (!props.item || !entityPermission.value?.allowInsert) {
    return
  }

  const copiedItem = { ...props.item }

  props.templates
    .filter((template) => template.name === 'handle' || template.isUnique)
    .forEach((template) => {
      delete copiedItem[template.name]
    })

  activeTab.value = 0
  emit('update:item', copiedItem)
  emit('update:mode', 'create')
}

function openTimelineFromRecord(): void {
  if (!entityHandle.value || itemHandle.value == null) {
    return
  }

  timelineDialogStore.openTimeline(entityHandle.value, itemHandle.value)
}

function navigateToAddress(): void {
  if (!props.item || !canNavigate.value) {
    return
  }

  const address = props.templates
    .filter((template) => template.options?.includes('isNavigation'))
    .map((template) => props.item?.[template.name || ''])
    .filter(Boolean)
    .join(' ')

  if (!address) {
    return
  }

  window.open(`${NAVIGATION_URL}${encodeURIComponent(address)}`, '_blank')
}

function navigateToDocuments(): void {
  if (!entityHandle.value || itemHandle.value == null) {
    return
  }

  const url = `/file/document?filter={"reference":"${String(itemHandle.value)}","entity":"${entityHandle.value}"}`
  window.open(url, '_blank')
}

function openUploadDialog(): void {
  if (!hasPersistedItem.value || !entityPermission.value?.allowInsert) {
    return
  }

  showUploadDialog.value = true
}

function openInformationDialog(): void {
  if (!hasPersistedItem.value || !canShowInformation.value) {
    return
  }

  showInformationDialog.value = true
}

async function reloadDialogItem(): Promise<void> {
  if (!entityHandle.value || itemHandle.value == null) {
    return
  }

  const result = await ApiGenericService.find<SaplingGenericItem>(entityHandle.value, {
    filter: { handle: itemHandle.value },
    limit: 1,
    relations: ['m:1'],
  })

  emit('update:item', result.data[0] ?? props.item)
}

async function runScriptButtonFromRecord(scriptButton: ScriptButtonItem): Promise<void> {
  if (!props.entity || !props.item) {
    return
  }

  await currentPersonStore.fetchCurrentPerson()
  if (!currentPersonStore.person) {
    return
  }

  const result = await ApiScriptService.runClient(
    [props.item],
    props.entity,
    currentPersonStore.person,
    scriptButton.name,
    scriptButton.parameter,
  )

  if (result.isSuccess !== false) {
    await reloadDialogItem()
  }
}

async function handleRecordAction(menuItem: SaplingContextMenuTableMenuItem): Promise<void> {
  switch (menuItem.type) {
    case 'copy':
      openCopyDialogFromRecord()
      break
    case 'timeline':
      openTimelineFromRecord()
      break
    case 'navigate':
      navigateToAddress()
      break
    case 'uploadDocument':
      openUploadDialog()
      break
    case 'showDocuments':
      navigateToDocuments()
      break
    case 'showInformation':
      openInformationDialog()
      break
    case 'script':
      if (menuItem.scriptButton) {
        await runScriptButtonFromRecord(menuItem.scriptButton)
      }
      break
    default:
      break
  }
}

async function loadScriptButtons(): Promise<void> {
  if (!entityHandle.value || !hasPersistedItem.value || props.mode === 'create') {
    loadedScriptButtons.value = []
    return
  }

  const currentRequestId = ++scriptButtonsRequestId
  const result = await ApiGenericService.find<ScriptButtonItem>('scriptButton', {
    filter: { entity: { handle: entityHandle.value } },
    orderBy: buildTableOrderBy([{ key: 'title', order: 'asc' }]),
    limit: DEFAULT_ENTITY_ITEMS_COUNT,
    relations: ['m:1'],
  })

  if (currentRequestId !== scriptButtonsRequestId) {
    return
  }

  loadedScriptButtons.value = result.data
}

async function confirmRecordDelete(): Promise<void> {
  if (!entityHandle.value || itemHandle.value == null) {
    return
  }

  try {
    await ApiGenericService.delete(entityHandle.value, itemHandle.value)
    closeRecordDeleteDialog()
    pushMessage(
      'success',
      t('global.recordDeleted'),
      t('global.recordDeletedDescription'),
      entityHandle.value,
    )
    emit('deleted', props.item)
    emit('update:modelValue', false)
    emit('cancel')
  } catch {
    // API errors are already routed through the shared message center.
  }
}

function onRelationSearch(templateName: string, search: string): void {
  relationTableSearch.value[templateName] = search
  relationTablePage.value[templateName] = 1
  onRelationTablePage(templateName, 1)
}

watch(visibleTemplateGroups, () => syncExpandedGroups(), { immediate: true })

watch(
  () => [props.modelValue, entityHandle.value, itemHandle.value, props.mode] as const,
  ([isOpen]) => {
    if (!isOpen) {
      loadedScriptButtons.value = []
      closeRecordDeleteDialog()
      closeUploadDialog()
      closeInformationDialog()
      return
    }

    void loadScriptButtons()
  },
  { immediate: true },
)

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
