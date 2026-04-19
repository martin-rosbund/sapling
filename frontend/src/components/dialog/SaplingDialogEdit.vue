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
                    :key="template.key"
                    class="sapling-dialog-edit-tab"
                  >
                    {{ $t(`${entity?.handle}.${template.name}`) }}
                  </v-tab>
                </template>
              </v-tabs>
            </div>
            <v-window v-model="activeTab" class="sapling-dialog-edit-window">
              <!-- Properties Tab -->
              <v-window-item :value="0" class="sapling-dialog-edit-window-item">
                <div class="sapling-dialog-edit-tab-scroll">
                  <div class="sapling-dialog-edit-form-surface">
                    <v-form ref="formRef" class="sapling-dialog-edit-form" @submit.prevent="save">
                      <v-row density="comfortable" class="sapling-dialog-edit-grid">
                        <v-col
                          v-for="template in visibleTemplates"
                          :key="template.key"
                          :cols="(template.length ?? 0) > 128 ? 12 : 12"
                          :sm="(template.length ?? 0) > 128 ? 12 : 12"
                          :md="(template.length ?? 0) > 128 ? 12 : 6"
                          :lg="(template.length ?? 0) > 128 ? 12 : 4"
                          class="sapling-dialog-edit-grid__column"
                        >
                          <div class="sapling-dialog-edit-field-shell">
                            <template v-if="template.isReference && showReference">
                              <SaplingSingleSelectField
                                v-if="
                                  permissions?.find(
                                    (x) => x.entityHandle === template.referenceName,
                                  )?.allowRead
                                "
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :entity-handle="template.referenceName ?? ''"
                                :model-value="form[template.name]"
                                :rules="getRules(template)"
                                :disabled="isReferenceFieldDisabled(template)"
                                :parent-filter="
                                  template.referenceDependency
                                    ? getReferenceParentFilter(template)
                                    : undefined
                                "
                                :placeholder="
                                  template.defaultRaw ? String(template.defaultRaw) : ''
                                "
                                @update:model-value="(val: any) => (form[template.name] = val)"
                              />
                            </template>
                            <template v-else>
                              <SaplingPhoneField
                                v-if="template.options?.includes('isPhone')"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :maxlength="template.length"
                                :disabled="isFieldDisabled(template)"
                                :required="template.isRequired"
                                :placeholder="template.default ? String(template.default) : ''"
                                :entity-handle="entity?.handle"
                                :item-handle="item?.handle"
                                :draft-values="form"
                                :rules="getRules(template)"
                                @update:model-value="(val: string) => (form[template.name] = val)"
                              />
                              <SaplingMailField
                                v-else-if="template.options?.includes('isMail')"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :maxlength="template.length"
                                :disabled="isFieldDisabled(template)"
                                :required="template.isRequired"
                                :placeholder="template.default ? String(template.default) : ''"
                                :entity-handle="entity?.handle ?? ''"
                                :item-handle="item?.handle"
                                :draft-values="form"
                                :rules="getRules(template)"
                                @update:model-value="(val: string) => (form[template.name] = val)"
                              />
                              <SaplingLinkField
                                v-else-if="template.options?.includes('isLink')"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :maxlength="template.length"
                                :disabled="isFieldDisabled(template)"
                                :required="template.isRequired"
                                :placeholder="template.default ? String(template.default) : ''"
                                :rules="getRules(template)"
                                @update:model-value="(val: string) => (form[template.name] = val)"
                              />
                              <SaplingColorField
                                v-else-if="template.options?.includes('isColor')"
                                :label="$t(`${entity?.handle}.${template.name}`)"
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :disabled="isFieldDisabled(template)"
                                :rules="getRules(template)"
                                :required="template.isRequired"
                                @update:model-value="(val: string) => (form[template.name] = val)"
                              />
                              <SaplingIconField
                                v-else-if="template.options?.includes('isIcon')"
                                :items="iconNames"
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :label="$t(`${entity?.handle}.${template.name}`)"
                                :disabled="isFieldDisabled(template)"
                                :rules="getRules(template)"
                                :required="template.isRequired"
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                              <SaplingFieldPercent
                                v-else-if="template.options?.includes('isPercent')"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="Number(form[template.name] ?? null)"
                                :disabled="isFieldDisabled(template)"
                                :required="template.nullable === false"
                                :placeholder="template.default ? String(template.default) : ''"
                                :rules="getRules(template)"
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                              <SaplingFieldMoney
                                v-else-if="template.options?.includes('isMoney')"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="Number(form[template.name] ?? null)"
                                :disabled="isFieldDisabled(template)"
                                :required="template.nullable === false"
                                :placeholder="template.default ? String(template.default) : ''"
                                :rules="getRules(template)"
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                              <SaplingFieldCellDuplicateCheck
                                v-else-if="
                                  template.options?.includes('isDuplicateCheck') &&
                                  mode === 'create'
                                "
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :entity-handle="entity?.handle ?? ''"
                                :model-value="form[template.name]"
                                :model-name="template.name"
                                :rules="getRules(template)"
                                :placeholder="template.default ? String(template.default) : ''"
                                :disabled="template.options?.includes('isReadOnly')"
                                :required="template.isRequired"
                                :entity-templates="visibleTemplates"
                                @update:modelValue="(val) => (form[template.name] = val)"
                                @select-record="onDuplicateSelect"
                              />
                              <SaplingNumberField
                                v-else-if="template.type === 'number'"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="Number(form[template.name] ?? null)"
                                :disabled="isFieldDisabled(template)"
                                :required="template.nullable === false"
                                :placeholder="template.default ? String(template.default) : ''"
                                :rules="getRules(template)"
                              />
                              <SaplingBooleanField
                                v-else-if="template.type === 'boolean'"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="Boolean(form[template.name])"
                                :disabled="isFieldDisabled(template)"
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                              <SaplingDateTimeField
                                v-else-if="template.type === 'datetime'"
                                :label="$t(`${entity?.handle}.${template.name}`)"
                                :date-value="
                                  form[template.name + '_date'] != null
                                    ? String(form[template.name + '_date'])
                                    : ''
                                "
                                :time-value="
                                  form[template.name + '_time'] != null
                                    ? String(form[template.name + '_time'])
                                    : ''
                                "
                                :disabled="isFieldDisabled(template)"
                                :rules="getRules(template)"
                                :required="template.isRequired"
                                @update:dateValue="
                                  (val: string) => (form[template.name + '_date'] = val)
                                "
                                @update:timeValue="
                                  (val: string) => (form[template.name + '_time'] = val)
                                "
                              />
                              <SaplingDateTypeField
                                v-else-if="template.type === 'DateType'"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :disabled="isFieldDisabled(template)"
                                :rules="getRules(template)"
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                              <SaplingTimeField
                                v-else-if="template.type === 'time'"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :disabled="isFieldDisabled(template)"
                                :rules="getRules(template)"
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                              <SaplingMarkdownField
                                v-else-if="template.options?.includes('isMarkdown')"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :rows="8"
                                :show-preview="true"
                                :disabled="isFieldDisabled(template)"
                                :rules="getRules(template)"
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                              <SaplingJsonField
                                v-else-if="template.type === 'JsonType'"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  typeof form[template.name] === 'string'
                                    ? null
                                    : form[template.name]
                                "
                                :disabled="isFieldDisabled(template)"
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                              <SaplingFieldAutoKey
                                v-else-if="template.options?.includes('isAutoKey')"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :maxlength="template.length"
                                :disabled="isFieldDisabled(template)"
                                :required="template.isRequired"
                                :placeholder="template.default ? String(template.default) : ''"
                                :rules="getRules(template)"
                                @update:model-value="(val: string) => (form[template.name] = val)"
                              />
                              <SaplingPasswordField
                                v-else-if="template.options?.includes('isSecurity')"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :maxlength="template.length"
                                :disabled="isFieldDisabled(template)"
                                :required="template.isRequired"
                                :placeholder="template.default ? String(template.default) : ''"
                                :rules="getRules(template)"
                                @update:model-value="(val: string) => (form[template.name] = val)"
                              />
                              <SaplingShortTextField
                                v-else-if="(template.length ?? 0) <= 128"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :maxlength="template.length"
                                :disabled="isFieldDisabled(template)"
                                :required="template.nullable === false"
                                :placeholder="template.default ? String(template.default) : ''"
                                :rules="getRules(template)"
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                              <SaplingLongTextField
                                v-else-if="(template.length ?? 0) > 128"
                                :label="
                                  $t(`${entity?.handle}.${template.name}`) +
                                  (template.isRequired ? '*' : '')
                                "
                                :model-value="
                                  form[template.name] != null ? String(form[template.name]) : ''
                                "
                                :maxlength="template.length"
                                :disabled="isFieldDisabled(template)"
                                :required="template.nullable === false"
                                :placeholder="template.default ? String(template.default) : ''"
                                :rules="getRules(template)"
                                auto-grow
                                @update:model-value="(val) => (form[template.name] = val)"
                              />
                            </template>
                          </div>
                        </v-col>
                      </v-row>
                    </v-form>
                  </div>
                </div>
              </v-window-item>
              <!-- Relation Tabs -->
              <v-window-item
                v-for="(template, idx) in relationTemplates"
                :key="template.key"
                :value="idx + 1"
                class="sapling-dialog-edit-window-item"
              >
                <div class="sapling-dialog-edit-tab-scroll">
                  <div class="sapling-dialog-edit-relation-shell">
                    <div class="sapling-dialog-edit-relation-header">
                      <div class="sapling-dialog-edit-relation-header__copy">
                        <div class="sapling-dialog-edit-relation-header__eyebrow">
                          {{ entityLabel }}
                        </div>
                        <h3 class="sapling-dialog-edit-relation-header__title">
                          {{ $t(`${entity?.handle}.${template.name}`) }}
                        </h3>
                      </div>
                      <v-chip
                        size="small"
                        color="primary"
                        variant="tonal"
                        prepend-icon="mdi-link-variant"
                      >
                        {{ relationTableTotal[template.name] ?? 0 }}
                      </v-chip>
                    </div>
                    <v-card class="sapling-dialog-edit-relation-card">
                      <v-card-text class="sapling-dialog-edit-relation-content">
                        <!-- Dropdown to select relation, and button to add -->
                        <div class="sapling-dialog-edit-relation-actions">
                          <div class="sapling-dialog-edit-relation-actions__field">
                            <SaplingSelectAddField
                              :label="$t('global.add')"
                              :entity-handle="template.referenceName ?? ''"
                              :model-value="selectedRelations[template.name] ?? []"
                              :rules="[]"
                              @update:model-value="
                                (val) => (selectedRelations[template.name] = val)
                              "
                              @add-selected="() => addRelation(template)"
                            />
                          </div>
                          <v-btn-group>
                            <v-btn
                              icon="mdi-close"
                              color="error"
                              variant="tonal"
                              :disabled="!selectedItems || selectedItems.length === 0"
                              @click="removeRelation(template, selectedItems)"
                            />
                          </v-btn-group>
                        </div>
                        <!-- Tabelle der verknüpften Items -->
                        <div class="sapling-dialog-edit-relation-table">
                          <sapling-table
                            :headers="relationTableHeaders[template.name] ?? []"
                            :items="relationTableItems[template.name] ?? []"
                            :parent="item"
                            :parent-entity="entity"
                            :search="relationTableSearch[template.name] || ''"
                            :page="relationTablePage[template.name] || 1"
                            :items-per-page="
                              relationTableItemsPerPage[template.name] || DEFAULT_PAGE_SIZE_SMALL
                            "
                            :total-items="relationTableTotal[template.name] ?? 0"
                            :is-loading="relationTableState[template.name]?.isLoading ?? false"
                            :sort-by="relationTableSortBy[template.name] || []"
                            :column-filters="relationTableColumnFilters[template.name] || {}"
                            :entity-handle="template.referenceName ?? ''"
                            :entity-templates="
                              relationTableState[template.name]?.entityTemplates ?? []
                            "
                            :entity="relationTableState[template.name]?.entity ?? null"
                            :entity-permission="
                              relationTableState[template.name]?.entityPermission ?? null
                            "
                            :show-actions="true"
                            :multi-select="true"
                            :table-key="template.name"
                            v-model:selected="selectedItems"
                            @update:search="
                              (val) => {
                                relationTableSearch[template.name] = val
                                relationTablePage[template.name] = 1
                                onRelationTablePage(template.name, 1)
                              }
                            "
                            @update:page="(val) => onRelationTablePage(template.name, val)"
                            @update:items-per-page="
                              (val) => onRelationTableItemsPerPage(template.name, val)
                            "
                            @update:sort-by="(val) => onRelationTableSort(template.name, val)"
                            @update:column-filters="
                              (val) => onRelationTableColumnFilters(template.name, val)
                            "
                            @reload="onRelationTableReload(template.name)"
                          />
                        </div>
                      </v-card-text>
                    </v-card>
                  </div>
                </div>
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
        <SaplingActionSave v-else :cancel="cancel" :save="save" :save-and-close="saveAndClose" />
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
// #region Imports
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingSingleSelectField from '@/components/dialog/fields/SaplingFieldSingleSelect.vue'
import SaplingTable from '@/components/table/SaplingTable.vue'
import SaplingBooleanField from '@/components/dialog/fields/SaplingFieldBoolean.vue'
import SaplingNumberField from '@/components/dialog/fields/SaplingFieldNumber.vue'
import SaplingFieldPercent from '@/components/dialog/fields/SaplingFieldPercent.vue'
import SaplingFieldMoney from '@/components/dialog/fields/SaplingFieldMoney.vue'
import SaplingDateTypeField from '@/components/dialog/fields/SaplingFieldDateType.vue'
import SaplingTimeField from '@/components/dialog/fields/SaplingFieldTime.vue'
import SaplingShortTextField from '@/components/dialog/fields/SaplingFieldShortText.vue'
import SaplingLongTextField from '@/components/dialog/fields/SaplingFieldLongText.vue'
import SaplingColorField from '@/components/dialog/fields/SaplingFieldColor.vue'
import SaplingIconField from '@/components/dialog/fields/SaplingFieldIcon.vue'
import SaplingDateTimeField from '@/components/dialog/fields/SaplingFieldDateTime.vue'
import SaplingPhoneField from '@/components/dialog/fields/SaplingFieldPhone.vue'
import SaplingMailField from '@/components/dialog/fields/SaplingFieldMail.vue'
import SaplingLinkField from '@/components/dialog/fields/SaplingFieldLink.vue'
import SaplingSelectAddField from '@/components/dialog/fields/SaplingFieldSelectAdd.vue'
import type { DialogSaveAction, DialogState, EntityTemplate } from '@/entity/structure'
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import SaplingPasswordField from '@/components/dialog/fields/SaplingFieldPassword.vue'
import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue'
import SaplingJsonField from '@/components/dialog/fields/SaplingFieldJson.vue'
import SaplingActionClose from '../actions/SaplingActionClose.vue'
import SaplingFieldCellDuplicateCheck from './fields/SaplingFieldCellDuplicateCheck.vue'
import { useSaplingDialogEdit } from '@/composables/dialog/useSaplingDialogEdit'
import SaplingActionSave from '../actions/SaplingActionSave.vue'
import SaplingDialogEditHero from '@/components/common/SaplingDialogEditHero.vue'
import SaplingFieldAutoKey from './fields/SaplingfIELDAutoKey.vue'
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

const { t, d, te } = useI18n()

// #region Composable
const {
  isLoading,
  form,
  formRef,
  activeTab,
  selectedRelations,
  visibleTemplates,
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
  getRules,
  isFieldDisabled,
  isReferenceFieldDisabled,
  getReferenceParentFilter,
  handleDialogUpdate,
  onDuplicateSelect,
  cancel,
  save,
  saveAndClose,
  addRelation,
  removeRelation,
  onRelationTablePage,
  onRelationTableItemsPerPage,
  onRelationTableSort,
  onRelationTableColumnFilters,
  onRelationTableReload,
} = useSaplingDialogEdit(props, emit)

const entityLabel = computed(() =>
  props.entity?.handle ? t(`navigation.${props.entity.handle}`) : '',
)

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

  return fallback
}

function formatTimestamp(value: unknown): string {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : d(date)
}

const createdAtTitle = computed(() => getTimestampTitle('createdAt', 'Created'))
const updatedAtTitle = computed(() => getTimestampTitle('updatedAt', 'Updated'))
const createdAtLabel = computed(() => formatTimestamp(props.item?.createdAt))
const updatedAtLabel = computed(() => formatTimestamp(props.item?.updatedAt))
// #endregion
</script>
<style scoped src="@/assets/styles/SaplingDialogEdit.css"></style>
