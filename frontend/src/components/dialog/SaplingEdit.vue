<template>
   <v-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" min-width="90%" min-height="90%" max-width="90%" max-height="90%" persistent>
    <v-skeleton-loader
      v-if="isLoading"
      class="mx-auto my-12 glass-panel"
      elevation="12"
      type="article, actions"
    />
    <template v-else>
      <v-card class="glass-panel tilt-element" v-tilt="{ max: 0.5, scale: 1 }">
        <v-card-title>
          {{ mode === 'edit' ? $t('global.editRecord') : $t('global.createRecord') }}
        </v-card-title>
        <v-card-text>
          <v-tabs v-model="activeTab" grow>
            <v-tab>
              {{ $t(`navigation.${props.entity?.handle}`) }}
            </v-tab>
            <template v-if="mode === 'edit'">
              <v-tab v-for="(template) in relationTemplates" :key="template.key">
                {{ $t(`${entity?.handle}.${template.name}`) }}
              </v-tab>
            </template>
          </v-tabs>
          <v-window v-model="activeTab">
            <!-- Properties Tab -->
            <v-window-item :value="0">
              <v-form ref="formRef" @submit.prevent="save">
                <v-row dense>
                  <v-col
                    v-for="template in visibleTemplates"
                    :key="template.key"
                      :cols="template.length > 128 ? 12 : 12" :sm="template.length > 128 ? 12 : 12" :md="template.length > 128 ? 12 : 6" :lg="template.length > 128 ? 12 : 4"
                  >
                    <sapling-table-row-dropdown
                      v-if="template.isReference && showReference"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      :columns="getReferenceColumnsSync(template)"
                      :fetchReferenceData="(params) => fetchReferenceData(template, params)"
                      :template="template"
                      :model-value="getReferenceModelValue(form[template.name])"
                      :rules="getRules(template)"
                      @update:model-value="val => form[template.name] = (typeof val === 'object' && val !== null ? val : null)"
                    />
                    <SaplingColorField
                      v-else-if="template.isColor"
                      :label="$t(`${entity?.handle}.${template.name}`)"
                      :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :rules="getRules(template)"
                      :required="template.isRequired"
                      @update:model-value="(val: string) => form[template.name] = val"
                    />
                    <SaplingIconField
                      v-else-if="template.isIcon"
                      :items="iconNames"
                      :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                      :label="$t(`${entity?.handle}.${template.name}`)"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :rules="getRules(template)"
                      :required="template.isRequired"
                      @update:model-value="val => form[template.name] = val"
                    />
                    <SaplingNumberField
                      v-else-if="template.type === 'number'"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      :model-value="Number(form[template.name] ?? null)"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :required="template.nullable === false"
                      :placeholder="template.default ? String(template.default) : ''"
                      :rules="getRules(template)"
                    />
                    <SaplingBooleanField
                      v-else-if="template.type === 'boolean'"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      :model-value="Boolean(form[template.name])"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      @update:model-value="val => form[template.name] = val"
                    />
                    <SaplingDateTimeField
                      v-else-if="template.type === 'datetime'"
                      :label="$t(`${entity?.handle}.${template.name}`)"
                      :date-value="form[template.name + '_date'] != null ? String(form[template.name + '_date']) : ''"
                      :time-value="form[template.name + '_time'] != null ? String(form[template.name + '_time']) : ''"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :rules="getRules(template)"
                      :required="template.isRequired"
                      @update:dateValue="(val: string) => form[template.name + '_date'] = val"
                      @update:timeValue="(val: string) => form[template.name + '_time'] = val"
                    />
                    <SaplingDateTypeField
                      v-else-if="template.type === 'DateType'"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :rules="getRules(template)"
                      @update:model-value="val => form[template.name] = val"
                    />
                    <SaplingTimeField
                      v-else-if="template.type === 'time'"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      :model-value="form[template.name + '_time'] != null ? String(form[template.name + '_time']) : ''"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :rules="getRules(template)"
                      @update:model-value="val => form[template.name + '_time'] = val"
                    />
                    <SaplingShortTextField
                      v-else-if="template.length <= 128"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired? '*' : '')"
                      :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                      :maxlength="template.length"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :required="template.nullable === false"
                      :placeholder="template.default ? String(template.default) : ''"
                      :rules="getRules(template)"
                      @update:model-value="val => form[template.name] = val"
                    />
                    <SaplingLongTextField
                      v-else-if="template.length > 128"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                      :maxlength="template.length"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :required="template.nullable === false"
                      :placeholder="template.default ? String(template.default) : ''"
                      :rules="getRules(template)"
                      auto-grow
                      @update:model-value="val => form[template.name] = val"
                    />
                  </v-col>
                </v-row>
              </v-form>
            </v-window-item>
            <!-- Relation Tabs -->
            <v-window-item
              v-for="(template, idx) in relationTemplates"
              :key="template.key"
              :value="idx + 1">
              <v-card flat outlined class="mb-4 transparent">
                <v-card-text>
                  <!-- Dropdown to select relation, and button to add -->
                  <div class="sapling-relation-toolbar d-flex align-center">
                    <sapling-table-row-dropdown
                      :label="$t('global.add')"
                      :columns="getReferenceColumnsSync(template)"
                      :fetchReferenceData="(params) => fetchReferenceData(template, params)"
                      :template="template"
                      :model-value="selectedRelation[template.name] ?? null"
                      :rules="[]"
                      @update:model-value="val => selectedRelation[template.name] = val"
                    />
                    <v-btn-group class="sapling-btn-group">
                      <v-btn
                        icon="mdi-plus"
                        color="primary"
                        :disabled="!selectedRelation[template.name]"
                        @click="addRelation(template)"
                      />
                      <v-btn
                        icon="mdi-close"
                        color="error"
                        :disabled="!selectedRelation[template.name]"
                        @click="removeRelation(template)"
                      />
                    </v-btn-group>
                  </div>
                  <!-- Tabelle der verknüpften Items -->
                    <template v-if="!relationTableState[template.name]?.isLoading">
                      <sapling-table
                        :headers="relationTableHeaders[template.name] ?? []"
                        :items="relationTableItems[template.name] ?? []"
                        :search="relationTableSearch[template.name] || ''"
                        :page="relationTablePage[template.name] || 1"
                        :items-per-page="relationTableItemsPerPage[template.name] || DEFAULT_PAGE_SIZE_MEDIUM"
                        :total-items="relationTableTotal[template.name] ?? 0"
                        :is-loading="false"
                        :sort-by="relationTableSortBy[template.name] || []"
                        :entity-name="template.referenceName"
                        :entity-templates="relationTableState[template.name]?.entityTemplates ?? []"
                        :entity="relationTableState[template.name]?.entity ?? null"
                        :entity-permission="relationTableState[template.name]?.entityPermission ?? null"
                        :show-actions="true"
                        :table-key="template.referenceName"
                        @update:page="val => onRelationTablePage(template.name, val)"
                        @update:items-per-page="val => onRelationTableItemsPerPage(template.name, val)"
                        @update:sort-by="val => onRelationTableSort(template.name, val)"
                      />
                    </template>
                    <template v-else>
                      <v-skeleton-loader type="table" class="sapling-table-skeleton" />
                    </template>
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancel">{{ $t('global.cancel') }}</v-btn>
          <v-btn color="primary" @click="save">{{ $t('global.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue';
import SaplingTableRowDropdown from '../table/SaplingTableRowDropdown.vue';
import SaplingTable from '../table/SaplingTable.vue';
import SaplingBooleanField from '../fields/SaplingBooleanField.vue';
import SaplingNumberField from '../fields/SaplingNumberField.vue';
import SaplingDateTypeField from '../fields/SaplingDateTypeField.vue';
import SaplingTimeField from '../fields/SaplingTimeField.vue';
import SaplingShortTextField from '../fields/SaplingShortTextField.vue';
import SaplingLongTextField from '../fields/SaplingLongTextField.vue';
import SaplingColorField from '../fields/SaplingColorField.vue';
import SaplingIconField from '../fields/SaplingIconField.vue';
import SaplingDateTimeField from '../fields/SaplingDateTimeField.vue';
import { useSaplingEdit } from '@/composables/dialog/useSaplingEdit';
import type { FormType, EntityTemplate } from '@/entity/structure';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
import type { EntityItem } from '@/entity/entity';
import '@/assets/styles/SaplingEdit.css'; // Import the CSS file for styling the edit component

const props = defineProps<{
  modelValue: boolean;
  mode: 'create' | 'edit';
  item: FormType | null;
  templates: EntityTemplate[];
  entity: EntityItem | null;
  showReference?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'save', 'cancel']);

const {
  isLoading,
  form,
  formRef,
  activeTab,
  selectedRelation,
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
  getReferenceModelValue,
  getRules,
  getReferenceColumnsSync,
  fetchReferenceData,
  onDialogUpdate,
  cancel,
  save,
  addRelation,
  removeRelation,
  onRelationTablePage,
  onRelationTableItemsPerPage,
  onRelationTableSort,
} = useSaplingEdit(props, emit);
// Icon-Auswahl für v-select
import { mdiIcons } from '@/constants/mdi.icons';
const iconNames = mdiIcons;
</script>
