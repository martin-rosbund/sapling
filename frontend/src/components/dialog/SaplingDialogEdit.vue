<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="handleDialogUpdate"
    :max-width="SAPLING_DIALOG_MAX_WIDTH['3xl']"
    :height="SAPLING_DIALOG_HEIGHT.xl"
    persistent
  >
    <SaplingDialogCard class="sapling-dialog-card--fill" :tilt="false">
      <div
        class="sapling-stack-xl sapling-record-dialog-shell sapling-dialog-edit-shell"
        @keydown="onShellKeydown"
      >
        <v-card-title class="sapling-record-dialog-header sapling-dialog-edit-header">
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
              <v-chip
                v-if="selectedFormConfigChipLabel"
                size="small"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-table-cog"
              >
                {{ selectedFormConfigChipLabel }}
              </v-chip>
            </template>

            <template #meta>
              <v-chip size="small" variant="outlined" prepend-icon="mdi-form-dropdown">
                {{ visibleTemplates.length }}
              </v-chip>
              <v-chip
                v-if="mode !== 'create'"
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
              <v-chip
                v-if="isDirty && mode !== 'readonly'"
                size="small"
                color="warning"
                variant="tonal"
                prepend-icon="mdi-pencil"
              >
                {{ dirtySummaryLabel }}
              </v-chip>
            </template>

            <template #actions>
              <v-btn
                v-if="canOpenFormConfigEditor"
                size="small"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-table-cog"
                :title="$t('formConfig.openForEntity')"
                @click="openFormConfigEditor"
              >
                {{ $t('formConfig.configure') }}
              </v-btn>
            </template>
          </SaplingDialogEditHero>
        </v-card-title>
        <v-card-text class="sapling-record-dialog-content sapling-dialog-edit-content">
          <template v-if="isLoading">
            <div class="sapling-stack-xl sapling-record-dialog-loading sapling-dialog-edit-loading">
              <v-skeleton-loader
                class="sapling-record-dialog-loading__tabs sapling-dialog-edit-loading__tabs"
                elevation="12"
                type="heading"
              />
              <v-skeleton-loader
                class="sapling-record-dialog-skeleton sapling-dialog-edit-skeleton"
                elevation="12"
                type="table"
              />
            </div>
          </template>
          <template v-else>
            <div class="sapling-dialog-edit-tabs-shell">
              <v-tabs v-model="activeTab" class="sapling-record-dialog-tabs" grow>
                <v-tab class="sapling-record-dialog-tab sapling-dialog-edit-tab">
                  {{ entityLabel }}
                </v-tab>
                <template v-if="mode !== 'create'">
                  <v-tab
                    v-for="template in relationTemplates"
                    :key="template.name"
                    class="sapling-record-dialog-tab sapling-dialog-edit-tab"
                  >
                    {{ $t(`${entity?.handle}.${template.name}`) }}
                  </v-tab>
                </template>
              </v-tabs>
            </div>
            <v-window
              v-model="activeTab"
              class="sapling-record-dialog-window sapling-dialog-edit-window"
            >
              <v-window-item
                :value="0"
                class="sapling-record-dialog-window-item sapling-dialog-edit-window-item"
              >
                <div class="sapling-record-dialog-tab-scroll sapling-dialog-edit-tab-scroll">
                  <div
                    ref="formSurfaceRef"
                    class="sapling-stack-lg sapling-record-dialog-surface sapling-dialog-edit-form-surface"
                  >
                    <v-form
                      ref="formRef"
                      class="sapling-record-dialog-form sapling-dialog-edit-form"
                      @submit.prevent="save"
                    >
                      <div
                        class="sapling-stack-lg sapling-record-dialog-form-layout sapling-dialog-edit-form-layout"
                      >
                        <section
                          v-for="group in visibleTemplateGroups"
                          :key="group.id"
                          class="sapling-section-panel sapling-record-section sapling-dialog-edit-section"
                          :class="{
                            'sapling-dialog-edit-section--collapsed':
                              group.label && !isGroupExpanded(group.id),
                            'sapling-record-section--dirty':
                              mode !== 'readonly' && isGroupDirty(group.templates),
                            'sapling-dialog-edit-section--dirty':
                              mode !== 'readonly' && isGroupDirty(group.templates),
                          }"
                        >
                          <div
                            v-if="group.label"
                            class="sapling-section-header sapling-record-section__header sapling-dialog-edit-section__header"
                          >
                            <button
                              type="button"
                              class="sapling-row-between-md sapling-record-section__toggle sapling-dialog-edit-section__toggle"
                              :aria-expanded="isGroupExpanded(group.id)"
                              @click="toggleGroup(group.id)"
                            >
                              <h3
                                class="sapling-section-title sapling-record-section__title sapling-dialog-edit-section__title"
                              >
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
                              class="sapling-record-section__body sapling-dialog-edit-section__body"
                            >
                              <v-row
                                density="comfortable"
                                class="sapling-record-form-grid sapling-dialog-edit-grid"
                              >
                                <v-col
                                  v-for="template in group.templates"
                                  :key="template.name"
                                  v-bind="getTemplateColumnProps(template)"
                                  class="sapling-record-form-grid__column sapling-dialog-edit-grid__column"
                                >
                                  <div
                                    class="sapling-record-field-shell sapling-dialog-edit-field-shell"
                                    :class="{
                                      'sapling-record-field-shell--dirty':
                                        mode !== 'readonly' && isTemplateDirty(template),
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
                class="sapling-record-dialog-window-item sapling-dialog-edit-window-item"
                :transition="false"
                :reverse-transition="false"
              >
                <SaplingDialogEditRelationTab
                  v-if="activeTab === idx + 1"
                  :template="template"
                  :mode="mode"
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
        <SaplingDialogEditActions
          :mode="mode"
          :is-loading="isLoading"
          :is-dirty="isDirty"
          :is-saving="isSaving"
          :pending-save-action="pendingSaveAction"
          :can-delete-record="canDeleteRecord"
          :record-action-buttons-disabled="recordActionButtonsDisabled"
          :edit-mobile-secondary-actions-disabled="editMobileSecondaryActionsDisabled"
          :has-readonly-mobile-action-menu="hasReadonlyMobileActionMenu"
          :record-action-menu-items="recordActionMenuItems"
          :mobile-record-action-menu-groups="mobileRecordActionMenuGroups"
          :reset-button-label="resetButtonLabel"
          @cancel="cancel"
          @delete="openRecordDeleteDialog"
          @reset="resetForm"
          @save="save"
          @save-and-close="saveAndClose"
          @select-action="handleRecordAction"
        />
      </div>
    </SaplingDialogCard>
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

  <SaplingExternalRecordLinksDialog
    v-if="showExternalRecordLinksDialog"
    :show="showExternalRecordLinksDialog"
    :item="item"
    :entity-handle="entityHandle"
    @update:show="(value) => !value && closeExternalRecordLinksDialog()"
    @close="closeExternalRecordLinksDialog"
  />

  <SaplingDialogUnsavedChanges
    :model-value="unsavedChangesDialog"
    :is-saving="isSaving"
    :is-saving-and-closing="pendingSaveAction === 'saveAndClose'"
    @keep-editing="keepEditing"
    @discard="discardChanges"
    @save-and-close="saveChangesAndClose"
  />
</template>

<script lang="ts" setup>
// #region Imports
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type {
  AccumulatedPermission,
  DialogSaveAction,
  DialogSaveContext,
  DialogState,
  EntityTemplate,
} from '@/entity/structure'
import {
  DEFAULT_ENTITY_ITEMS_COUNT,
  DEFAULT_PAGE_SIZE_SMALL,
  NAVIGATION_URL,
} from '@/constants/project.constants'
import { SAPLING_DIALOG_MAX_WIDTH, SAPLING_DIALOG_HEIGHT } from '@/constants/dialog.constants'
import type { EntityItem, SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import { useSaplingDialogEdit } from '@/composables/dialog/useSaplingDialogEdit'
import {
  getSaplingContextMenuTableItems,
  type SaplingContextMenuTableMenuEntry,
  type SaplingContextMenuTableMenuItem,
} from '@/composables/context/useSaplingContextMenuTable'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useSaplingMailDialog } from '@/composables/dialog/useSaplingMailDialog'
import { buildMailMenuActions } from '@/utils/saplingMailMenuUtil'
import SaplingDialogEditHero from '@/components/common/SaplingDialogEditHero.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue'
import SaplingDialogEditActions from '@/components/dialog/SaplingDialogEditActions.vue'
import SaplingDialogUnsavedChanges from '@/components/dialog/SaplingDialogUnsavedChanges.vue'
import SaplingDialogEditFieldRenderer from './SaplingDialogEditFieldRenderer.vue'
import SaplingDialogEditRelationTab from './SaplingDialogEditRelationTab.vue'
import SaplingExternalRecordLinksDialog from '@/components/import/SaplingExternalRecordLinksDialog.vue'
import SaplingTableRowInformation from '@/components/table/SaplingTableRowInformation.vue'
import SaplingTableRowUpload from '@/components/table/SaplingTableRowUpload.vue'
import ApiGenericService from '@/services/api.generic.service'
import ApiScriptService from '@/services/api.script.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useTimelineDialogStore } from '@/stores/timelineDialogStore'
import { useChangeLogDialogStore } from '@/stores/changeLogDialogStore'
import { buildTableOrderBy } from '@/utils/saplingTableUtil'
import {
  buildScriptButtonExecutionKey,
  handleScriptResultClient,
  pushScriptButtonAlreadyRunningMessage,
  pushScriptButtonStartedMessage,
} from '@/utils/saplingScriptResultUtil'
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
  forceDirtyFields?: string[]
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

const { t, d, te } = useI18n()
const router = useRouter()
const { pushMessage } = useSaplingMessageCenter()
const currentPersonStore = useCurrentPersonStore()
const timelineDialogStore = useTimelineDialogStore()
const changeLogDialogStore = useChangeLogDialogStore()
const { openMailDialog } = useSaplingMailDialog()

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
  formConfigMenuItems,
  selectedFormConfigLabel,
  selectFormConfig,
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
} = useSaplingDialogEdit(props, emit, {
  forceDirty: computed(() => props.forceDirty === true),
  forceDirtyFields: computed(() =>
    Array.isArray(props.forceDirtyFields) ? props.forceDirtyFields : [],
  ),
})

function onShellKeydown(event: KeyboardEvent) {
  // Keyboard shortcuts inside the edit dialog:
  //   Ctrl/Cmd + S        -> save (keep dialog open)
  //   Ctrl/Cmd + Enter    -> save & close
  //   Escape              -> cancel (uses unsaved-changes confirmation when dirty)
  const isMod = event.ctrlKey || event.metaKey
  if (event.repeat) {
    return
  }

  if (isMod && !event.altKey && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void save()
    return
  }

  if (isMod && !event.altKey && event.key === 'Enter') {
    event.preventDefault()
    void saveAndClose()
    return
  }

  if (event.key === 'Escape' && !isMod && !event.altKey) {
    event.preventDefault()
    cancel()
  }
}

async function openFormConfigEditor(): Promise<void> {
  const targetEntityHandle = props.entity?.handle
  if (!targetEntityHandle) {
    return
  }

  await router.push({ name: 'formConfig', query: { entity: targetEntityHandle } })
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

const recordDeleteDialog = ref(false)
const showUploadDialog = ref(false)
const showInformationDialog = ref(false)
const showExternalRecordLinksDialog = ref(false)
const loadedScriptButtons = ref<ScriptButtonItem[]>([])
const runningScriptActionCount = ref(0)
const formSurfaceRef = ref<HTMLElement | null>(null)

let scriptButtonsRequestId = 0
const runningScriptButtonKeys = new Set<string>()

const isScriptActionRunning = computed(() => runningScriptActionCount.value > 0)

const recordActionButtonsDisabled = computed(
  () => isSaving.value || isScriptActionRunning.value || (props.mode === 'edit' && isDirty.value),
)

const recordActionMenuItems = computed<SaplingContextMenuTableMenuEntry[]>(() => {
  const groups: SaplingContextMenuTableMenuEntry[] =
    !hasPersistedItem.value || props.mode === 'create'
      ? []
      : getSaplingContextMenuTableItems({
          canChangeLog: hasPersistedItem.value,
          canShowInformation: canShowInformation.value,
          entityPermission: entityPermission.value,
          canNavigate: canNavigate.value,
          canTimeline: true,
          canShowExternalRecordLinks: true,
          scriptButtons: loadedScriptButtons.value,
          mailActions: buildMailMenuActions(props.templates, form.value),
          mailToLabel: t('global.mailTo'),
          showEdit: false,
        })
          .map((group) =>
            (Array.isArray(group) ? group : [group]).filter(
              (menuItem) => !['edit', 'show', 'delete'].includes(menuItem.type),
            ),
          )
          .filter((group) => group.length > 0)

  if (formConfigMenuItems.value.length > 0) {
    groups.push(
      formConfigMenuItems.value.map((item) => ({
        type: 'formConfig',
        icon: item.active ? 'mdi-check-circle-outline' : item.icon,
        title: item.title,
        formConfigHandle: item.handle,
      })),
    )
  }

  return groups
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
const selectedFormConfigChipLabel = computed(() =>
  selectedFormConfigLabel.value
    ? `${t('formConfig.currentView')}: ${selectedFormConfigLabel.value}`
    : '',
)
const canOpenFormConfigEditor = computed(
  () => currentPersonStore.isAdministrator && Boolean(props.entity?.handle),
)

const resetButtonLabel = computed(() => t('filter.reset'))

const mobileRecordActionMenuGroups = computed<SaplingContextMenuTableMenuItem[][]>(() =>
  recordActionMenuItems.value
    .map((group) => (Array.isArray(group) ? group : [group]))
    .filter((group) => group.length > 0),
)

const hasReadonlyMobileActionMenu = computed(
  () => mobileRecordActionMenuGroups.value.length > 0 || canDeleteRecord.value,
)

const editMobileSecondaryActionsDisabled = computed(() => {
  const hasDirtyActions = isDirty.value && !isSaving.value
  const hasPersistedActions =
    !recordActionButtonsDisabled.value &&
    (canDeleteRecord.value || mobileRecordActionMenuGroups.value.length > 0)

  return !hasDirtyActions && !hasPersistedActions
})

const dirtySummaryLabel = computed(() => {
  if (dirtyFieldCount.value <= 0) {
    return ''
  }

  return t('global.dirtyFieldCount', { count: dirtyFieldCount.value }, dirtyFieldCount.value)
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
  applyReferenceTemplate(key, value)
}

function applyReferenceTemplate(key: string, value: unknown): void {
  if (!value || typeof value !== 'object') {
    return
  }

  const template = visibleTemplates.value.find((entry) => entry.name === key)
  const mappings = template?.referenceTemplate?.mappings ?? []
  if (mappings.length === 0) {
    return
  }

  const source = value as Record<string, unknown>
  mappings.forEach((mapping) => {
    if (!mapping.sourceField || !mapping.targetField) {
      return
    }

    const nextValue = source[mapping.sourceField]
    if (nextValue === undefined || nextValue === null) {
      return
    }

    const currentValue = form.value[mapping.targetField]
    const hasCurrentValue =
      currentValue !== undefined &&
      currentValue !== null &&
      currentValue !== '' &&
      (!Array.isArray(currentValue) || currentValue.length > 0)

    if (mapping.overwrite === false && hasCurrentValue) {
      return
    }

    form.value[mapping.targetField] = nextValue
  })
}

function updateSelectedRelationItems(templateName: string, items: SaplingGenericItem[]): void {
  selectedRelations.value[templateName] = items
}

function updateSelectedRelationTableItems(items: SaplingGenericItem[]): void {
  selectedItems.value = items
}

function closeUploadDialog(): void {
  showUploadDialog.value = false
}

function closeInformationDialog(): void {
  showInformationDialog.value = false
}

function closeExternalRecordLinksDialog(): void {
  showExternalRecordLinksDialog.value = false
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

function openChangeLogFromRecord(): void {
  if (!entityHandle.value || itemHandle.value == null) {
    return
  }

  changeLogDialogStore.openChangeLog(entityHandle.value, itemHandle.value)
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

function openExternalRecordLinksDialog(): void {
  if (!hasPersistedItem.value) {
    return
  }

  showExternalRecordLinksDialog.value = true
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

  const executionKey = buildScriptButtonExecutionKey(scriptButton, [props.item])
  const scriptEntity = entityHandle.value || props.entity?.handle || 'script'
  if (runningScriptButtonKeys.has(executionKey)) {
    pushScriptButtonAlreadyRunningMessage({
      button: scriptButton,
      entity: scriptEntity,
      pushMessage,
      translate: t,
      hasTranslation: te,
    })
    return
  }

  runningScriptButtonKeys.add(executionKey)
  runningScriptActionCount.value = runningScriptButtonKeys.size
  pushScriptButtonStartedMessage({
    button: scriptButton,
    entity: scriptEntity,
    itemCount: 1,
    pushMessage,
    translate: t,
    hasTranslation: te,
  })

  try {
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

    await handleScriptResultClient(result, {
      entity: scriptEntity,
      pushMessage,
      onItemData: (item) => emit('update:item', item as SaplingGenericItem),
    })

    if (result.isSuccess !== false) {
      await reloadDialogItem()
    }
  } catch {
    // API errors are already routed through the shared message center.
  } finally {
    runningScriptButtonKeys.delete(executionKey)
    runningScriptActionCount.value = runningScriptButtonKeys.size
  }
}

async function handleRecordAction(menuItem: SaplingContextMenuTableMenuItem): Promise<void> {
  switch (menuItem.type) {
    case 'copy':
      openCopyDialogFromRecord()
      break
    case 'changeLog':
      openChangeLogFromRecord()
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
    case 'showExternalRecordLinks':
      openExternalRecordLinksDialog()
      break
    case 'mail':
      if (menuItem.mailAction?.email && entityHandle.value) {
        openMailDialog({
          entityHandle: entityHandle.value,
          itemHandle: itemHandle.value ?? undefined,
          draftValues: form.value,
          initialTo: [menuItem.mailAction.email],
        })
      }
      break
    case 'script':
      if (menuItem.scriptButton) {
        await runScriptButtonFromRecord(menuItem.scriptButton)
      }
      break
    case 'formConfig':
      selectFormConfig(menuItem.formConfigHandle ?? null)
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

/**
 * Auto-focus the first editable, non-disabled input once the dialog has
 * finished its initial loading. Saves the user a `Tab` step when entering
 * data and matches typical CRUD UX conventions.
 */
async function focusFirstField(): Promise<void> {
  if (props.mode === 'readonly') {
    return
  }

  await nextTick()
  const surface = formSurfaceRef.value
  if (!surface) {
    return
  }

  const candidates = surface.querySelectorAll<HTMLElement>(
    'input:not([type=hidden]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])',
  )

  for (const candidate of Array.from(candidates)) {
    if (candidate.offsetParent === null) {
      continue
    }
    if (candidate.getAttribute('aria-hidden') === 'true') {
      continue
    }
    candidate.focus({ preventScroll: true })
    if (candidate instanceof HTMLInputElement && candidate.type === 'text') {
      candidate.select?.()
    }
    return
  }
}

watch(
  () => [props.modelValue, isLoading.value, props.mode] as const,
  ([isOpen, loading]) => {
    if (isOpen && !loading) {
      void focusFirstField()
    }
  },
)
// #endregion
</script>
