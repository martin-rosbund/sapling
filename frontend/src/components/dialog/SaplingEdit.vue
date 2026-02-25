<template>
   <v-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" min-width="90vw" min-height="90vh" max-width="90vw" max-height="90vh" persistent>
      <v-card class="glass-panel pa-6" style="height: 100%; min-height: 90vh; display: flex; flex-direction: column;">
        <v-skeleton-loader
          v-if="isLoading"
          class="sapling-skeleton-fullheight transparent"
          elevation="12"
          type="table, actions"
        />
        <template v-else>
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
                        :cols="(template.length ?? 0) > 128 ? 12 : 12"
                        :sm="(template.length ?? 0) > 128 ? 12 : 12"
                        :md="(template.length ?? 0) > 128 ? 12 : 6"
                        :lg="(template.length ?? 0) > 128 ? 12 : 4"
                    >
                      <SaplingSingleSelectField
                        v-if="template.isReference && showReference"
                        :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                        :entity-name="template.referenceName ?? ''"
                        :model-value="form[template.name]"
                        :rules="getRules(template)"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        :placeholder="template.defaultRaw ? String(template.defaultRaw) : ''"
                        @update:model-value="(val: any) => form[template.name] = val"
                      />
                      <SaplingPhoneField
                        v-else-if="template.options?.includes('isPhone')"
                        :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                        :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                        :maxlength="template.length"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
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
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
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
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        :required="template.isRequired"
                        :placeholder="template.default ? String(template.default) : ''"
                        :rules="getRules(template)"
                        @update:model-value="(val: string) => form[template.name] = val"
                      />
                      <SaplingColorField
                        v-else-if="template.options?.includes('isColor')"
                        :label="$t(`${entity?.handle}.${template.name}`)"
                        :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        :rules="getRules(template)"
                        :required="template.isRequired"
                        @update:model-value="(val: string) => form[template.name] = val"
                      />
                      <SaplingIconField
                        v-else-if="template.options?.includes('isIcon')"
                        :items="iconNames"
                        :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                        :label="$t(`${entity?.handle}.${template.name}`)"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        :rules="getRules(template)"
                        :required="template.isRequired"
                        @update:model-value="val => form[template.name] = val"
                      />
                      <SaplingNumberField
                        v-else-if="template.type === 'number'"
                        :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                        :model-value="Number(form[template.name] ?? null)"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        :required="template.nullable === false"
                        :placeholder="template.default ? String(template.default) : ''"
                        :rules="getRules(template)"
                      />
                      <SaplingBooleanField
                        v-else-if="template.type === 'boolean'"
                        :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                        :model-value="Boolean(form[template.name])"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        @update:model-value="val => form[template.name] = val"
                      />
                      <SaplingDateTimeField
                        v-else-if="template.type === 'datetime'"
                        :label="$t(`${entity?.handle}.${template.name}`)"
                        :date-value="form[template.name + '_date'] != null ? String(form[template.name + '_date']) : ''"
                        :time-value="form[template.name + '_time'] != null ? String(form[template.name + '_time']) : ''"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        :rules="getRules(template)"
                        :required="template.isRequired"
                        @update:dateValue="(val: string) => form[template.name + '_date'] = val"
                        @update:timeValue="(val: string) => form[template.name + '_time'] = val"
                      />
                      <SaplingDateTypeField
                        v-else-if="template.type === 'DateType'"
                        :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                        :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        :rules="getRules(template)"
                        @update:model-value="val => form[template.name] = val"
                      />
                      <SaplingTimeField
                        v-else-if="template.type === 'time'"
                        :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                        :model-value="form[template.name + '_time'] != null ? String(form[template.name + '_time']) : ''"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        :rules="getRules(template)"
                        @update:model-value="val => form[template.name + '_time'] = val"
                      />
                      <SaplingMarkdownField
                        v-else-if="template.options?.includes('isMarkdown')"
                        :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                        :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                        :rows="8"
                        :show-preview="true"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                        :rules="getRules(template)"
                        @update:model-value="val => form[template.name] = val"
                      />
                      <SaplingJsonField
                        v-else-if="template.type === 'JsonType'"
                        :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                        v-model="form[template.name]"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
                      />
                      <SaplingPasswordField
                        v-else-if="template.options?.includes('isSecurity')"
                        :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                        :model-value="form[template.name] != null ? String(form[template.name]) : ''"
                        :maxlength="template.length"
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
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
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
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
                        :disabled="(template.isPrimaryKey && mode === 'edit') || template.options?.includes('isReadOnly') || mode === 'readonly'"
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
                    <div class="d-flex align-center">
                        <div style="flex: 1 1 0;">
                          <SaplingSelectAddField
                            :label="$t('global.add')"
                            :entity-name="template.referenceName ?? ''"
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
                      <template v-if="!relationTableState[template.name]?.isLoading">
                        <sapling-table
                          :headers="relationTableHeaders[template.name] ?? []"
                          :items="relationTableItems[template.name] ?? []"
                          :parent="item"
                          :parent-entity="entity"
                          :search="relationTableSearch[template.name] || ''"
                          :page="relationTablePage[template.name] || 1"
                          :items-per-page="relationTableItemsPerPage[template.name] || DEFAULT_PAGE_SIZE_SMALL"
                          :total-items="relationTableTotal[template.name] ?? 0"
                          :is-loading="false"
                          :sort-by="relationTableSortBy[template.name] || []"
                          :entity-name="template.referenceName ?? ''"
                          :entity-templates="relationTableState[template.name]?.entityTemplates ?? []"
                          :entity="relationTableState[template.name]?.entity ?? null"
                          :entity-permission="relationTableState[template.name]?.entityPermission ?? null"
                          :show-actions="true"
                          :multi-select="true"
                          :table-key="template.referenceName ?? ''"
                          v-model:selected="selectedItems"
                          @update:search="val => { relationTableSearch[template.name] = val; relationTablePage[template.name] = 1; onRelationTablePage(template.name, 1); }"
                          @update:page="val => onRelationTablePage(template.name, val)"
                          @update:items-per-page="val => onRelationTableItemsPerPage(template.name, val)"
                          @update:sort-by="val => onRelationTableSort(template.name, val)"
                          @reload="onRelationTableReload(template.name)"
                        />
                      </template>
                      <template v-else>
                        <v-skeleton-loader type="table" class="transparent" />
                      </template>
                  </v-card-text>
                </v-card>
              </v-window-item>
            </v-window>
          </v-card-text>
          <template v-if="mode == 'readonly'">
            <SaplingCloseAction :close="cancel" />
          </template>
          <template v-else>
            <SaplingSaveAction :cancel="cancel" :save="save" />
          </template>         
        </template>
      </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, watchEffect } from 'vue';
import SaplingSingleSelectField from '@/components/dialog/fields/SaplingFieldSingleSelect.vue';
import SaplingTable from '@/components/table/SaplingTable.vue';
import SaplingBooleanField from '@/components/dialog/fields/SaplingFieldBoolean.vue';
import SaplingNumberField from '@/components/dialog/fields/SaplingFieldNumber.vue';
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
import { useSaplingEdit } from '@/composables/dialog/useSaplingEdit';
import type { DialogState, EntityTemplate } from '@/entity/structure';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import type { EntityItem, SaplingGenericItem } from '@/entity/entity';
import SaplingSaveAction from '@/components/actions/SaplingSaveAction.vue';
import SaplingPasswordField from '@/components/dialog/fields/SaplingFieldPassword.vue';
import { mdiIcons } from '@/constants/mdi.icons';
import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue';
import SaplingJsonField from '@/components/dialog/fields/SaplingFieldJson.vue';
import SaplingCloseAction from '../actions/SaplingCloseAction.vue';

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

const emit = defineEmits(['update:modelValue', 'save', 'cancel']);


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
  getRules,
  onDialogUpdate,
  cancel,
  save,
  addRelation,
  removeRelation,
  onRelationTablePage,
  onRelationTableItemsPerPage,
  onRelationTableSort,
  onRelationTableReload,
} = useSaplingEdit(props, emit);

// Dynamisch m:1-Referenzen aus parent setzen (reaktiv)
watchEffect(() => {
  if (props.parent && props.templates && props.mode === 'create') {
    props.templates.filter(t => ['m:1', 'm:n', 'n:m'].includes(t.kind ?? '')).forEach(t => {
      if (t.referenceName  === props.parentEntity?.handle) {
        if(['m:1'].includes(t.kind ?? '')) {
           form.value[t.name] = props.parent;
        } else {
           form.value[t.name] = [props.parent];
        }}
    });
  }
});

const iconNames = mdiIcons;
const selectedItems = ref<SaplingGenericItem[]>([]);

</script>
