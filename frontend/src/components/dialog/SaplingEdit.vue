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
                    :fetchReferenceData="(params: { search: string; page: number; pageSize: number }) => fetchReferenceData(template, params)"
                    :template="template"
                    :model-value="null"
                    :rules="[]"
                  />
                  <!-- Tabelle der verknüpften Items -->
                    <template v-if="!relationTableState[template.name]?.loading">
                      <sapling-table
                        :headers="relationTableHeaders[template.name] ?? []"
                        :items="relationTableItems[template.name] ?? []"
                        :search="relationTableSearch[template.name] || ''"
                        :page="relationTablePage[template.name] || 1"
                        :items-per-page="relationTableItemsPerPage[template.name] || DEFAULT_PAGE_SIZE_MEDIUM"
                        :total-items="relationTableTotal[template.name] ?? 0"
                        :is-loading="false"
                        :sort-by="[]"
                        :entity-name="template.referenceName"
                        :entity-templates="relationTableState[template.name]?.templates ?? []"
                        :entity="relationTableState[template.name]?.entity ?? null"
                        :entity-permission="relationTableState[template.name]?.permission ?? null"
                        :show-actions="true"
                        :table-key="template.referenceName"
                        @update:search="val => onRelationTableSearch(template.name, val)"
                        @update:page="val => onRelationTablePage(template.name, val)"
                        @update:items-per-page="val => onRelationTableItemsPerPage(template.name, val)"
                      />
                    </template>
                    <template v-else>
                      <v-skeleton-loader type="table" class="my-4" />
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
const relationTableState = ref<Record<string, {
  templates: EntityTemplate[];
  entity: EntityItem | null;
  permission: AccumulatedPermission | null;
  loading: boolean;
}>>({});
const relationTableItems = ref<Record<string, unknown[]>>({});
import type { AccumulatedPermission } from '@/entity/structure';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';

// Neue States für Suche und Pagination
const relationTableSearch = ref<Record<string, string>>({});
const relationTablePage = ref<Record<string, number>>({});
const relationTableTotal = ref<Record<string, number>>({});
const relationTableItemsPerPage = ref<Record<string, number>>({});

// Konvertiere EntityTemplate[] zu SaplingEntityHeaderItem[]
import { useI18n } from 'vue-i18n';
import { ENTITY_SYSTEM_COLUMNS } from '@/constants/project.constants';
const { t } = useI18n();
const relationTableHeaders = computed(() => {
  const result: Record<string, any[]> = {};
  for (const key in relationTableState.value) {
    let singularEntityName = key;
    try {
      singularEntityName = genericStore.getState('edit-rel-' + key).currentEntityName;
    } catch {}
    console.log(relationTableState.value[key]?.templates)
    result[key] = (relationTableState.value[key]?.templates ?? [])
      .filter((x: any) => {
        const template = (relationTableState.value[key]?.templates ?? []).find((t: any) => t.name === x.name);
        return !ENTITY_SYSTEM_COLUMNS.includes(x.name) && !(template && template.isAutoIncrement);
      })
      .map((tpl: any) => ({
        ...tpl,
        key: tpl.name,
        title: t(`${singularEntityName}.${tpl.name}`),
      }));
  }
  return result;
});

async function loadRelationTableTemplates() {
  for (const template of relationTemplates.value) {
    if (!relationTableState.value[template.name]) {
      relationTableState.value[template.name] = {
        templates: [],
        entity: null,
        permission: null,
        loading: false
      };
    }
    const relState = relationTableState.value[template.name] ?? (relationTableState.value[template.name] = {
      templates: [],
      entity: null,
      permission: null,
      loading: false
    });
    relState.loading = true;
    await genericStore.loadGeneric('edit-rel-' + template.name, template.referenceName, 'global');
    const state = genericStore.getState('edit-rel-' + template.name);
    relState.templates = state.entityTemplates.filter((x: any) => !x.isSystem);
    relState.entity = state.entity ?? null;
    relState.permission = state.entityPermission ?? null;
    relState.loading = false;
  }
}

async function loadRelationTableItems() {
  for (const template of relationTemplates.value) {
    if (!relationTableState.value[template.name]) {
      relationTableState.value[template.name] = {
        templates: [],
        entity: null,
        permission: null,
        loading: false
      };
    }
    const relState = relationTableState.value[template.name] ?? (relationTableState.value[template.name] = {
      templates: [],
      entity: null,
      permission: null,
      loading: false
    });
    relState.loading = true;
    const filter: Record<string, unknown> = {};
    if (props.item && template.mappedBy && props.item.handle) {
      filter[template.mappedBy] = props.item.handle;
    }
    const search = relationTableSearch.value[template.name] || '';
    const page = relationTablePage.value[template.name] || 1;
    const limit = relationTableItemsPerPage.value[template.name] || DEFAULT_PAGE_SIZE_MEDIUM;
    if (props.mode === 'edit' && props.item && template.referenceName) {
      let apiFilter = { ...filter };
      if (search) {
        const columns = relationTableState.value[template.name]?.templates ?? [];
        apiFilter = {
          ...apiFilter,
          $or: columns.map((col: any) => ({ [col.name]: { $like: `%${search}%` } }))
        };
      }
      const result = await ApiGenericService.find(template.referenceName, { filter: apiFilter, limit, page, relations: ['m:1'] });
      relationTableItems.value[template.name] = result.data;
      relationTableTotal.value[template.name] = result.meta?.total ?? result.data.length;
    } else {
      relationTableItems.value[template.name] = [];
      relationTableTotal.value[template.name] = 0;
    }
    relState.loading = false;
  }
}

// Methoden für Suche und Pagination mit Debounce für Suche
const relationTableSearchTimeouts = ref<Record<string, ReturnType<typeof setTimeout> | null>>({});
function onRelationTableSearch(name: string, val: string) {
  relationTableSearch.value[name] = val;
  relationTablePage.value[name] = 1;
  // Debounce: Timer zurücksetzen
  if (relationTableSearchTimeouts.value[name]) {
    clearTimeout(relationTableSearchTimeouts.value[name]!);
  }
  relationTableSearchTimeouts.value[name] = setTimeout(() => {
    loadRelationTableItems();
    relationTableSearchTimeouts.value[name] = null;
  }, 350);
}
function onRelationTablePage(name: string, val: number) {
  relationTablePage.value[name] = val;
  loadRelationTableItems();
}
function onRelationTableItemsPerPage(name: string, val: number) {
  relationTableItemsPerPage.value[name] = val;
  relationTablePage.value[name] = 1;
  loadRelationTableItems();
}

onMounted(async () => {
  await loadRelationTableTemplates();
  // Initialisiere States für alle Relation-Tabs
  for (const template of relationTemplates.value) {
    relationTableSearch.value[template.name] = '';
    relationTablePage.value[template.name] = 1;
    relationTableTotal.value[template.name] = 0;
    relationTableItemsPerPage.value[template.name] = DEFAULT_PAGE_SIZE_MEDIUM;
  }
  await loadRelationTableItems();
});

watch(() => [props.item, props.mode, relationTemplates.value], async () => {
  // States neu initialisieren
  for (const template of relationTemplates.value) {
    if (!(template.name in relationTableSearch.value)) relationTableSearch.value[template.name] = '';
    if (!(template.name in relationTablePage.value)) relationTablePage.value[template.name] = 1;
    if (!(template.name in relationTableTotal.value)) relationTableTotal.value[template.name] = 0;
    if (!(template.name in relationTableItemsPerPage.value)) relationTableItemsPerPage.value[template.name] = DEFAULT_PAGE_SIZE_MEDIUM;
  }
  await loadRelationTableItems();
});
// #endregion
</script>
