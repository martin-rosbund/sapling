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
                    <SaplingEntityRowDropdown
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
                  <SaplingEntityRowDropdown
                    :label="$t(`global.add`)"
                    :columns="getReferenceColumnsSync(template)"
                    :fetchReferenceData="(params) => fetchReferenceData(template, params)"
                    :template="template"
                    :model-value="null"
                    :rules="[]"
                    @update:model-value="val => onAddRelation(template.name, val)"
                  />
                  <SaplingEntity
                    :headers="getReferenceColumnsSync(template).map(col => ({ ...col, title: $t(`${template.referenceName}.${col.name}`) }))"
                    :items="relationEntities[template.name] || []"
                    :search="relationSearch[template.name] || ''"
                    :page="relationPage[template.name] || 1"
                    :items-per-page="relationItemsPerPage[template.name] || DEFAULT_PAGE_SIZE_MEDIUM"
                    :total-items="(relationEntities[template.name] || []).length"
                    :is-loading="relationLoading[template.name] || false"
                    :sort-by="relationSortBy[template.name] || []"
                    :entity-name="template.referenceName"
                    :entity-templates="relationLoaders[template.name]?.entityTemplates"
                    :entity="relationLoaders[template.name]?.entity"
                    :entity-permission="relationLoaders[template.name]?.entityPermission"
                    :show-actions="true"
                    @update:search="val => relationSearch[template.name] = val"
                    @update:page="val => relationPage[template.name] = val"
                    @update:itemsPerPage="val => relationItemsPerPage[template.name] = val"
                    @update:sortBy="val => relationSortBy[template.name] = val"
                    @edit="(item, idx) => updateRelationEntity(template.name, idx, item)"
                    @delete="(item, idx) => removeRelationEntity(template.name, idx)"
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
import { defineProps, defineEmits, ref, watch } from 'vue';
import SaplingEntityRowDropdown from '../entity/SaplingEntityRowDropdown.vue';
import SaplingEntity from '../entity/SaplingEntity.vue';
import { useEntityEditDialog } from '@/composables/dialog/useEntityEditDialog';
import { useGenericLoader } from '@/composables/generic/useGenericLoader';
import type { EntityItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
import type { SortItem } from '@/composables/entity/useSaplingEntity';
// #endregion

// #region Props and Emits
// Local state for search, page, itemsPerPage, sortBy for each relation tab
const relationSearch = ref({} as Record<string, string>)
const relationPage = ref({} as Record<string, number>)
const relationItemsPerPage = ref({} as Record<string, number>)
const relationSortBy = ref({} as Record<string, SortItem[]>)
const activeTab = ref(0);
import type { FormType } from '@/entity/structure';
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
  relationEntities,
  relationLoading,
  removeRelationEntity,
  updateRelationEntity,
  getReferenceModelValue,
  getRules,
  getReferenceColumnsSync,
  fetchReferenceData,
  onDialogUpdate,
  cancel,
  save,
} = useEntityEditDialog(props, emit);
// #endregion

// #region Relation Loader Map
// Add relation logic
function onAddRelation(relationName: string, val: unknown) {
  if (!val) return;
  // Prevent duplicates
  const existing = relationEntities.value[relationName] || [];
  const columns = getReferenceColumnsSync(relationTemplates.value.find(t => t.name === relationName)!);
  const pk = getReferencePk(val as Record<string, unknown>, columns);
  if (existing.some(e => getReferencePk(e as Record<string, unknown>, columns) === pk)) return;
  // Add to relationEntities
  if (!relationEntities.value[relationName]) relationEntities.value[relationName] = [];
  relationEntities.value[relationName].push(val);
}

function getReferencePk(item: Record<string, unknown>, columns: EntityTemplate[]) {
  if (!item || !columns) return '';
  const pkCol = columns.find(c => c.isPrimaryKey);
  return pkCol ? item[pkCol.name] : '';
}
import { onMounted } from 'vue';
// Für jede Relation ein useGenericLoader-Objekt erzeugen
const relationLoaders = ref<Record<string, ReturnType<typeof useGenericLoader>>>({});

function ensureRelationLoader(template: EntityTemplate) {
  if (!relationLoaders.value[template.name]) {
    const loader = useGenericLoader(template.referenceName);
    relationLoaders.value[template.name] = loader;
    // Initialen Ladevorgang starten
    onMounted(() => loader.loadGeneric());
  }
  return relationLoaders.value[template.name];
}

// Wenn relationTemplates sich ändern, Loader aktualisieren
watch(
  () => relationTemplates.value.map(t => t.name + ':' + t.referenceName).join(','),
  () => {
    relationTemplates.value.forEach(template => {
      const loader = ensureRelationLoader(template);
      // Nachträglich laden, falls dynamisch hinzugefügt
  if (loader) loader.loadGeneric();
    });
  },
  { immediate: true }
);
// #endregion
</script>
