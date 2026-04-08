<template>
  <v-dialog :model-value="modelValue" @update:model-value="handleDialogUpdate" min-width="95vw" min-height="95vh" max-width="95vw" max-height="95vh" persistent>
      <v-card class="glass-panel pa-6 sapling-dialog-edit-card">
        <v-card-title>
          {{ isLoading ? '' : mode === 'edit' ? $t('global.editRecord') : $t('global.createRecord') }}
        </v-card-title>
        <v-card-text class="sapling-dialog-edit-content">
          <template v-if="isLoading">
            <div class="sapling-dialog-edit-loading">
              <v-skeleton-loader
                class="sapling-dialog-edit-loading__tabs"
                elevation="12"
                type="heading"
              />
              <v-skeleton-loader
                class="sapling-dialog-edit-skeleton"
                elevation="12"
                type="table"
              />
            </div>
          </template>
          <template v-else>
            <v-tabs v-model="activeTab" class="sapling-dialog-edit-tabs" grow>
              <v-tab>
                {{ $t(`navigation.${props.entity?.handle}`) }}
              </v-tab>
              <template v-if="mode === 'edit'">
                <v-tab v-for="(template) in relationTemplates" :key="template.key">
                  {{ $t(`${entity?.handle}.${template.name}`) }}
                </v-tab>
              </template>
            </v-tabs>
            <v-window v-model="activeTab" class="sapling-dialog-edit-window">
              <!-- Properties Tab -->
              <v-window-item :value="0" class="sapling-dialog-edit-window-item">
                <div class="sapling-dialog-edit-tab-scroll">
                  <v-form ref="formRef" class="sapling-dialog-edit-form" @submit.prevent="save">
                    <v-row density="comfortable">
                      <v-col
                          v-for="template in visibleTemplates"
                          :key="template.key"
                          :cols="(template.length ?? 0) > 128 ? 12 : 12"
                          :sm="(template.length ?? 0) > 128 ? 12 : 12"
                          :md="(template.length ?? 0) > 128 ? 12 : 6"
                          :lg="(template.length ?? 0) > 128 ? 12 : 4"
                      >
                        <template v-if="template.isReference && showReference">
                          <SaplingSingleSelectField
                            v-if="permissions?.find(x => x.entityHandle === template.referenceName)?.allowRead"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :entity-handle="template.referenceName ?? ''"
                            :model-value="form[template.name]"
                            :rules="getRules(template)"
                            :disabled="isReferenceFieldDisabled(template)"
                            :parent-filter="template.referenceDependency ? getReferenceParentFilter(template) : undefined"
                            :placeholder="template.defaultRaw ? String(template.defaultRaw) : ''"
                            @update:model-value="(val: any) => form[template.name] = val"
                          />
                        </template>
                        <template v-else>
                          <SaplingPhoneField
                            v-if="template.options?.includes('isPhone')"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :maxlength="template.length"
                            :disabled="isFieldDisabled(template)"
                            :required="template.isRequired"
                            :placeholder="template.default ? String(template.default) : ''"
                            :rules="getRules(template)"
                            @update:model-value="(val: string) => form[template.name] = val"
                          />
                          <SaplingMailField
                            v-else-if="template.options?.includes('isMail')"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :maxlength="template.length"
                            :disabled="isFieldDisabled(template)"
                            :required="template.isRequired"
                            :placeholder="template.default ? String(template.default) : ''"
                            :rules="getRules(template)"
                            @update:model-value="(val: string) => form[template.name] = val"
                          />
                          <SaplingLinkField
                            v-else-if="template.options?.includes('isLink')"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :maxlength="template.length"
                            :disabled="isFieldDisabled(template)"
                            :required="template.isRequired"
                            :placeholder="template.default ? String(template.default) : ''"
                            :rules="getRules(template)"
                            @update:model-value="(val: string) => form[template.name] = val"
                          />
                          <SaplingColorField
                            v-else-if="template.options?.includes('isColor')"
                            :label="$t(`${entity?.handle}.${template.name}`)"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :disabled="isFieldDisabled(template)"
                            :rules="getRules(template)"
                            :required="template.isRequired"
                            @update:model-value="(val: string) => form[template.name] = val"
                          />
                          <SaplingIconField
                            v-else-if="template.options?.includes('isIcon')"
                            :items="iconNames"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :label="$t(`${entity?.handle}.${template.name}`)"
                            :disabled="isFieldDisabled(template)"
                            :rules="getRules(template)"
                            :required="template.isRequired"
                            @update:model-value="val => form[template.name] = val"
                          />
                          <SaplingFieldPercent
                            v-else-if="template.options?.includes('isPercent')"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="Number(form[template.name] ?? null)"
                            :disabled="isFieldDisabled(template)"
                            :required="template.nullable === false"
                            :placeholder="template.default ? String(template.default) : ''"
                            :rules="getRules(template)"
                            @update:model-value="val => form[template.name] = val"
                          />
                          <SaplingFieldMoney
                            v-else-if="template.options?.includes('isMoney')"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="Number(form[template.name] ?? null)"
                            :disabled="isFieldDisabled(template)"
                            :required="template.nullable === false"
                            :placeholder="template.default ? String(template.default) : ''"
                            :rules="getRules(template)"
                            @update:model-value="val => form[template.name] = val"
                          />
                          <SaplingFieldCellDuplicateCheck
                            v-else-if="template.options?.includes('isDuplicateCheck') && mode === 'create'"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :entity-handle="entity?.handle ?? ''"
                            :model-value="form[template.name]"
                            :model-name="template.name"
                            :rules="getRules(template)"
                            :placeholder="template.default ? String(template.default) : ''"
                            :disabled="template.options?.includes('isReadOnly')"
                            :required="template.isRequired"
                            :entity-templates="visibleTemplates"
                            @update:modelValue="val => form[template.name] = val"
                            @select-record="onDuplicateSelect"
                          />
                          <SaplingNumberField
                            v-else-if="template.type === 'number'"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="Number(form[template.name] ?? null)"
                            :disabled="isFieldDisabled(template)"
                            :required="template.nullable === false"
                            :placeholder="template.default ? String(template.default) : ''"
                            :rules="getRules(template)"
                          />
                          <SaplingBooleanField
                            v-else-if="template.type === 'boolean'"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="Boolean(form[template.name])"
                            :disabled="isFieldDisabled(template)"
                            @update:model-value="val => form[template.name] = val"
                          />
                          <SaplingDateTimeField
                            v-else-if="template.type === 'datetime'"
                            :label="$t(`${entity?.handle}.${template.name}`)"
                            :date-value="form[template.name + '_date'] != null ? String(form[template.name + '_date']) : ''"
                            :time-value="form[template.name + '_time'] != null ? String(form[template.name + '_time']) : ''"
                            :disabled="isFieldDisabled(template)"
                            :rules="getRules(template)"
                            :required="template.isRequired"
                            @update:dateValue="(val: string) => form[template.name + '_date'] = val"
                            @update:timeValue="(val: string) => form[template.name + '_time'] = val"
                          />
                          <SaplingDateTypeField
                            v-else-if="template.type === 'DateType'"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :disabled="isFieldDisabled(template)"
                            :rules="getRules(template)"
                            @update:model-value="val => form[template.name] = val"
                          />
                          <SaplingTimeField
                            v-else-if="template.type === 'time'"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :disabled="isFieldDisabled(template)"
                            :rules="getRules(template)"
                            @update:model-value="val => form[template.name] = val"
                          />
                          <SaplingMarkdownField
                            v-else-if="template.options?.includes('isMarkdown')"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :rows="8"
                            :show-preview="true"
                            :disabled="isFieldDisabled(template)"
                            :rules="getRules(template)"
                            @update:model-value="val => form[template.name] = val"
                          />
                          <SaplingJsonField
                            v-else-if="template.type === 'JsonType'"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="typeof form[template.name] === 'string' ? null : form[template.name]"
                            :disabled="isFieldDisabled(template)"
                            @update:model-value="val => form[template.name] = val"
                          />
                          <SaplingPasswordField
                            v-else-if="template.options?.includes('isSecurity')"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :maxlength="template.length"
                            :disabled="isFieldDisabled(template)"
                            :required="template.isRequired"
                            :placeholder="template.default ? String(template.default) : ''"
                            :rules="getRules(template)"
                            @update:model-value="(val: string) => form[template.name] = val"
                          />
                          <SaplingShortTextField
                            v-else-if="(template.length ?? 0) <= 128"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired? '*' : '')"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :maxlength="template.length"
                            :disabled="isFieldDisabled(template)"
                            :required="template.nullable === false"
                            :placeholder="template.default ? String(template.default) : ''"
                            :rules="getRules(template)"
                            @update:model-value="val => form[template.name] = val"
                          />
                          <SaplingLongTextField
                            v-else-if="(template.length ?? 0) > 128"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                            :maxlength="template.length"
                            :disabled="isFieldDisabled(template)"
                            :required="template.nullable === false"
                            :placeholder="template.default ? String(template.default) : ''"
                            :rules="getRules(template)"
                            auto-grow
                            @update:model-value="val => form[template.name] = val"
                          />
                        </template>
                      </v-col>
                    </v-row>
                  </v-form>
                </div>
              </v-window-item>
              <!-- Relation Tabs -->
              <v-window-item
                v-for="(template, idx) in relationTemplates"
                :key="template.key"
                :value="idx + 1"
                class="sapling-dialog-edit-window-item">
                <div class="sapling-dialog-edit-tab-scroll">
                  <v-card flat outlined class="mb-4 sapling-dialog-edit-relation-card">
                    <v-card-text class="sapling-dialog-edit-relation-content">
                      <!-- Dropdown to select relation, and button to add -->
                      <div class="d-flex align-center sapling-dialog-edit-relation-actions">
                          <div style="flex: 1 1 0;">
                            <SaplingSelectAddField
                              :label="$t('global.add')"
                              :entity-handle="template.referenceName ?? ''"
                              :model-value="selectedRelations[template.name] ?? []"
                              :rules="[]"
                              style="width: 100%;"
                              @update:model-value="val => selectedRelations[template.name] = val"
                              @add-selected="() => addRelation(template)"
                            />
                          </div>
                          <v-btn-group class="ml-2">
                            <v-btn
                              icon="mdi-close"
                              color="error"
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
                          :items-per-page="relationTableItemsPerPage[template.name] || DEFAULT_PAGE_SIZE_SMALL"
                          :total-items="relationTableTotal[template.name] ?? 0"
                          :is-loading="relationTableState[template.name]?.isLoading ?? false"
                          :sort-by="relationTableSortBy[template.name] || []"
                          :column-filters="relationTableColumnFilters[template.name] || {}"
                          :entity-handle="template.referenceName ?? ''"
                          :entity-templates="relationTableState[template.name]?.entityTemplates ?? []"
                          :entity="relationTableState[template.name]?.entity ?? null"
                          :entity-permission="relationTableState[template.name]?.entityPermission ?? null"
                          :show-actions="true"
                          :multi-select="true"
                          :table-key="template.name"
                          v-model:selected="selectedItems"
                          @update:search="val => { relationTableSearch[template.name] = val; relationTablePage[template.name] = 1; onRelationTablePage(template.name, 1); }"
                          @update:page="val => onRelationTablePage(template.name, val)"
                          @update:items-per-page="val => onRelationTableItemsPerPage(template.name, val)"
                          @update:sort-by="val => onRelationTableSort(template.name, val)"
                          @update:column-filters="val => onRelationTableColumnFilters(template.name, val)"
                          @reload="onRelationTableReload(template.name)"
                        />
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </v-window-item>
            </v-window>
          </template>
        </v-card-text>
        <template v-if="isLoading">
          <v-card-actions>
            <v-btn text prepend-icon="mdi-close" @click="cancel">
              <template v-if="$vuetify.display.mdAndUp"></template>
            </v-btn>
            <v-spacer />
            <v-btn v-if="mode !== 'readonly'" color="primary" append-icon="mdi-content-save" disabled>
              <template v-if="$vuetify.display.mdAndUp"></template>
            </v-btn>
          </v-card-actions>
        </template>
        <template v-else-if="mode == 'readonly'">
          <SaplingActionClose :close="cancel" />
        </template>
        <template v-else>
          <SaplingActionSave :cancel="cancel" :save="save" />
        </template>
      </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
// #region Imports
import SaplingSingleSelectField from '@/components/dialog/fields/SaplingFieldSingleSelect.vue';
import SaplingTable from '@/components/table/SaplingTable.vue';
import SaplingBooleanField from '@/components/dialog/fields/SaplingFieldBoolean.vue';
import SaplingNumberField from '@/components/dialog/fields/SaplingFieldNumber.vue';
import SaplingFieldPercent from '@/components/dialog/fields/SaplingFieldPercent.vue';
import SaplingFieldMoney from '@/components/dialog/fields/SaplingFieldMoney.vue';
import SaplingDateTypeField from '@/components/dialog/fields/SaplingFieldDateType.vue';
import SaplingTimeField from '@/components/dialog/fields/SaplingFieldTime.vue';
import SaplingShortTextField from '@/components/dialog/fields/SaplingFieldShortText.vue';
import SaplingLongTextField from '@/components/dialog/fields/SaplingFieldLongText.vue';
import SaplingColorField from '@/components/dialog/fields/SaplingFieldColor.vue';
import SaplingIconField from '@/components/dialog/fields/SaplingFieldIcon.vue';
import SaplingDateTimeField from '@/components/dialog/fields/SaplingFieldDateTime.vue';
import SaplingPhoneField from '@/components/dialog/fields/SaplingFieldPhone.vue';
import SaplingMailField from '@/components/dialog/fields/SaplingFieldMail.vue';
import SaplingLinkField from '@/components/dialog/fields/SaplingFieldLink.vue';
import SaplingSelectAddField from '@/components/dialog/fields/SaplingFieldSelectAdd.vue';
import type { DialogState, EntityTemplate } from '@/entity/structure';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import type { EntityItem, SaplingGenericItem } from '@/entity/entity';
import SaplingPasswordField from '@/components/dialog/fields/SaplingFieldPassword.vue';
import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue';
import SaplingJsonField from '@/components/dialog/fields/SaplingFieldJson.vue';
import SaplingActionClose from '../actions/SaplingActionClose.vue';
import SaplingFieldCellDuplicateCheck from './fields/SaplingFieldCellDuplicateCheck.vue';
import { useSaplingDialogEdit } from '@/composables/dialog/useSaplingDialogEdit';
import SaplingActionSave from '../actions/SaplingActionSave.vue';
// #endregion

// #region Props & Emits
const props = defineProps<{
  modelValue: boolean;
  mode: DialogState;
  item: SaplingGenericItem | null;
  parent?: SaplingGenericItem | null;
  parentEntity?: EntityItem | null;
  templates: EntityTemplate[];
  entity: EntityItem | null;
  showReference?: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  // The edit dialog emits entity-specific payloads that vary by template.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event: 'save', value: any): void;
  (event: 'cancel'): void;
  (event: 'update:mode', value: DialogState): void;
  (event: 'update:item', value: SaplingGenericItem | null): void;
}>();
// #endregion

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
  addRelation,
  removeRelation,
  onRelationTablePage,
  onRelationTableItemsPerPage,
  onRelationTableSort,
  onRelationTableColumnFilters,
  onRelationTableReload,
} = useSaplingDialogEdit(props, emit);
// #endregion
</script>
<style scoped src="@/assets/styles/SaplingDialogEdit.css"></style>
