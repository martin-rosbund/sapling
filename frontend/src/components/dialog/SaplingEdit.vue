<template>
  <v-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" max-width="1600px" max-height="800px" min-height="800px" persistent>
    <v-skeleton-loader
      v-if="isLoading"
      class="mx-auto"
      elevation="12"
      type="article, actions"
    />
    <template v-else>
      <v-card>
        <v-card-title>
          {{ mode === 'edit' ? $t('global.editRecord') : $t('global.createRecord') }}
        </v-card-title>
        <v-card-text>
          <v-tabs v-model="activeTab" grow>
            <v-tab>
              {{ $t(`navigation.${props.entity?.handle}`) }}
            </v-tab>
            <v-tab v-for="(template) in relationTemplates" :key="template.key">
              {{ $t(`${entity?.handle}.${template.name}`) }}
            </v-tab>
          </v-tabs>
          <v-window v-model="activeTab">
            <!-- Properties Tab -->
            <v-window-item :value="0">
              <v-form ref="formRef" @submit.prevent="save">
                <v-row dense>
                  <v-col
                    v-for="template in visibleTemplates"
                    :key="template.key"
                    cols="12" sm="12" md="6" lg="4"
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
                    <v-text-field
                      v-else-if="template.type === 'number'"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      v-model.number="form[template.name]"
                      type="number"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :required="template.nullable === false"
                      :placeholder="template.default ? String(template.default) : ''"
                      :rules="getRules(template)"
                    />
                    <v-checkbox
                      v-else-if="template.type === 'boolean'"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      v-model="form[template.name]"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                    />
                    <template v-else-if="template.type === 'datetime'">
                      <v-row dense>
                        <v-col :cols="8">
                          <v-date-input
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            v-model="form[template.name + '_date']"
                            :disabled="template.isPrimaryKey && mode === 'edit'"
                            :rules="getRules(template)"
                          />
                        </v-col>
                        <v-col :cols="4">
                          <v-text-field
                            type="time"
                            :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                            v-model="form[template.name + '_time']"
                            :disabled="template.isPrimaryKey && mode === 'edit'"
                            :rules="getRules(template)"
                          />
                        </v-col>
                      </v-row>
                    </template>
                    <v-date-input
                      v-else-if="template.type === 'DateType'"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      v-model="form[template.name]"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :rules="getRules(template)"
                    />
                    <v-text-field
                      v-else-if="template.type === 'time'"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      v-model="form[template.name + '_time']"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :rules="getRules(template)"
                    />
                    <v-text-field
                      v-else-if="template.type !== 'number' && template.type !== 'boolean' && template.type !== 'datetime' && template.type !== 'date' && template.type !== 'time' && template.length <= 64"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired? '*' : '')"
                      v-model="form[template.name]"
                      :maxlength="template.length"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :required="template.nullable === false"
                      :placeholder="template.default ? String(template.default) : ''"
                      :rules="getRules(template)"
                    />
                    <v-textarea
                      v-else-if="template.length > 128"
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      v-model="form[template.name]"
                      :maxlength="template.length"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :required="template.nullable === false"
                      :placeholder="template.default ? String(template.default) : ''"
                      :rules="getRules(template)"
                      auto-grow
                    />
                    <v-text-field
                      v-else
                      :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                      v-model="form[template.name]"
                      :maxlength="template.length"
                      :disabled="template.isPrimaryKey && mode === 'edit'"
                      :required="template.nullable === false"
                      :placeholder="template.default? String(template.default) : ''"
                      :rules="getRules(template)"
                    />
                  </v-col>
                </v-row>
              </v-form>
            </v-window-item>
            <!-- Relation Tabs -->
            <v-window-item
              v-for="(template, idx) in relationTemplates"
              :key="template.key"
              :value="idx + 1"
            >
              <v-card flat outlined class="mb-4">
                <v-card-text>
                  <!-- Dropdown to add relation -->
                  <sapling-table-row-dropdown
                    :label="$t(`global.add`)"
                    :columns="getReferenceColumnsSync(template)"
                    :fetchReferenceData="(params) => fetchReferenceData(template, params)"
                    :template="template"
                    :model-value="null"
                    :rules="[]"
                  />
                  <!-- Tabelle der verknüpften Items -->
                  <sapling-table
                    :headers="relationTableHeaders[template.name] ?? []"
                    :items="relationTableItems[template.name] ?? []"
                    :search="''"
                    :page="1"
                    :items-per-page="DEFAULT_PAGE_SIZE_MEDIUM"
                    :total-items="(relationTableItems[template.name]?.length ?? 0)"
                    :is-loading="relationTableLoading[template.name] ?? false"
                    :sort-by="[]"
                    :entity-name="template.referenceName"
                    :entity-templates="relationTableTemplates[template.name] ?? []"
                    :entity="relationTableEntities[template.name] ?? null"
                    :entity-permission="relationTablePermissions[template.name] ?? null"
                    :show-actions="false"
                    :table-key="template.referenceName"
                  />
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
// #region Imports
import { defineProps, defineEmits, ref, watch, computed, onMounted } from 'vue';
import SaplingTableRowDropdown from '../table/SaplingTableRowDropdown.vue';
import SaplingTable from '../table/SaplingTable.vue';
import { useSaplingEdit } from '@/composables/dialog/useSaplingEdit';
import { useGenericStore } from '@/stores/genericStore';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import type { FormType } from '@/entity/structure';
// #endregion

// #region Props and Emits
const activeTab = ref(0);

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
  showReference,
  isLoading,
  form,
  formRef,
  visibleTemplates,
  relationTemplates,
  getReferenceModelValue,
  getRules,
  getReferenceColumnsSync,
  fetchReferenceData,
  onDialogUpdate,
  cancel,
  save,
} = useSaplingEdit(props, emit);

// --- Relation Table State ---

const genericStore = useGenericStore();
const relationTableTemplates = ref<Record<string, EntityTemplate[]>>({});
const relationTableItems = ref<Record<string, unknown[]>>({});
const relationTableLoading = ref<Record<string, boolean>>({});
const relationTableEntities = ref<Record<string, EntityItem | null>>({});
import type { AccumulatedPermission } from '@/entity/structure';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
const relationTablePermissions = ref<Record<string, AccumulatedPermission | null>>({});

// Konvertiere EntityTemplate[] zu SaplingEntityHeaderItem[]
import { useI18n } from 'vue-i18n';
import { ENTITY_SYSTEM_COLUMNS } from '@/constants/project.constants';
const { t } = useI18n();
const relationTableHeaders = computed(() => {
  const result: Record<string, any[]> = {};
  for (const key in relationTableTemplates.value) {
    // Hole den korrekten Singular-Entity-Namen aus genericStore
    let singularEntityName = key;
    try {
      singularEntityName = genericStore.getState('edit-rel-' + key).currentEntityName;
    } catch {}
    result[key] = (relationTableTemplates.value[key] ?? [])
      .filter(x => {
        const template = (relationTableTemplates.value[key] ?? []).find(t => t.name === x.name);
        return !ENTITY_SYSTEM_COLUMNS.includes(x.name) && !(template && template.isAutoIncrement);
      })
      .map(tpl => ({
        ...tpl,
        key: tpl.name,
        title: t(`${singularEntityName}.${tpl.name}`),
      }));
  }
  return result;
});

async function loadRelationTableTemplates() {
  for (const template of relationTemplates.value) {
    relationTableLoading.value[template.name] = true;
    await genericStore.loadGeneric('edit-rel-' + template.name, template.referenceName, 'global');
    const state = genericStore.getState('edit-rel-' + template.name);
    relationTableTemplates.value[template.name] = state.entityTemplates.filter(x => !x.isSystem && !x.isReference);
    relationTableLoading.value[template.name] = false;
  }
}

async function loadRelationTableItems() {
  for (const template of relationTemplates.value) {
    relationTableLoading.value[template.name] = true;
    // Filter nach mappedBy = Hauptobjekt.handle
    const filter: Record<string, unknown> = {};
    if (props.item && template.mappedBy && props.item.handle) {
      filter[template.mappedBy] = props.item.handle;
    }
    // Nur im Edit-Modus laden
    if (props.mode === 'edit' && props.item && template.referenceName) {
      const result = await ApiGenericService.find(template.referenceName, { filter, limit: 50, page: 1 });
      relationTableItems.value[template.name] = result.data;
    } else {
      relationTableItems.value[template.name] = [];
    }
    relationTableLoading.value[template.name] = false;
  }
}

onMounted(async () => {
  await loadRelationTableTemplates();
  await loadRelationTableItems();
});

watch(() => [props.item, props.mode, relationTemplates.value], async () => {
  await loadRelationTableItems();
});
// #endregion
</script>
