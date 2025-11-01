<template>
  <v-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" max-width="1600px" max-height="800px" persistent>
    <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto"
        elevation="12"
        type="article, actions"/>
    <template v-else>
      <v-card>
        <v-card-title>
          {{ mode === 'edit' ? $t('global.editRecord') : $t('global.createRecord') }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <template v-if="visibleTemplates.length < 3">
              <div v-for="template in visibleTemplates" :key="template.key" style="margin-bottom: 16px;">
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
              </div>
            </template>
            <template v-else>
              <v-row dense>
                <v-col
                  v-for="template in visibleTemplates"
                  :key="template.key"
                  cols="12" sm="12" md="6" lg="4">
                  <!-- ...Feld-Rendering wie oben... -->
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
            </template>
          </v-form>
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
import { defineProps, defineEmits, ref, watch, onMounted, computed, type Ref } from 'vue';
import type { EntityTemplate, FormType } from '@/entity/structure';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityItem } from '@/entity/entity';
import SaplingEntityRowDropdown from '../entity/SaplingEntityRowDropdown.vue';
// #endregion

// #region Props and Emits
const props = defineProps<{
  modelValue: boolean;
  mode: 'create' | 'edit';
  item: FormType | null;
  templates: EntityTemplate[];
  entity: EntityItem | null;
  showReference?: boolean;
}>();
const emit = defineEmits(['update:modelValue', 'save', 'cancel']);
// #endregion

// #region State
const showReference = props.showReference !== false;
const isLoading = ref(true);
const form: Ref<FormType> = ref({});
type VuetifyFormRef = {
  validate: () => Promise<{ valid: boolean } | undefined>;
};
const formRef: Ref<VuetifyFormRef | null> = ref(null);
const referenceColumnsMap: Ref<Record<string, EntityTemplate[]>> = ref({});
// #endregion

// #region Computed
// Filter visible templates for rendering
const visibleTemplates = computed(() =>
  props.templates.filter(x =>
    !x.isSystem &&
    !x.isAutoIncrement &&
    !['1:m', 'm:n'].includes(x.kind || '') &&
    (!x.isPrimaryKey || props.mode === 'create') &&
    (!x.isReference || showReference)
  )
);
// #endregion

// #region Methods
// Helper to guarantee correct type for ReferenceDropdown modelValue
function getReferenceModelValue(val: unknown): Record<string, unknown> | null {
  return (val !== undefined && typeof val === 'object' && val !== null) ? val as Record<string, unknown> : null;
}

// Validation rule for required fields
const requiredRule = (label: string) => (v: unknown) =>
  v !== null && v !== undefined && v !== '' ? true : `${label} ${i18n.global.t('global.isRequired')}`;

// Get validation rules for a template
function getRules(template: EntityTemplate): Array<(v: unknown) => true | string> {
  const rules: Array<(v: unknown) => true | string> = [];
  if (template.isRequired) {
    rules.push(requiredRule(i18n.global.t(`${props.entity?.handle}.${template.name}`)));
  }
  // Additional rules (e.g., for length, type) can be added here
  return rules;
}

// Build form state from templates and item/defaults
function initializeForm(): void {
  form.value = {};
  props.templates?.forEach(t => {
    if (t.isReference) {
      // For reference fields, always assign object or null
      if (props.mode === 'edit' && props.item) {
        const val = props.item[t.name];
        form.value[t.name] = (val && typeof val === 'object') ? val : null;
      } else {
        form.value[t.name] = null;
      }
    } else if (t.type === 'datetime') {
      // Split datetime into date and time for picker
      let dt = '';
      if (props.mode === 'edit' && props.item && props.item[t.name]) {
        dt = String(props.item[t.name] ?? '');
      } else if (t.default) {
        dt = String(t.default ?? '');
      }
      if (dt) {
        // dt: 'YYYY-MM-DDTHH:mm' or ISO
        const [date, time] = dt.split('T');
        form.value[t.name + '_date'] = date || '';
        form.value[t.name + '_time'] = (time || '').slice(0,5); // HH:mm
      } else {
        form.value[t.name + '_date'] = '';
        form.value[t.name + '_time'] = '';
      }
    } else {
      if (props.mode === 'edit' && props.item) {
        form.value[t.name] = props.item[t.name] ?? t.default ?? '';
      } else {
        form.value[t.name] = t.default ?? (t.type === 'boolean' ? false : '');
      }
    }
  });
}

// Get columns for reference dropdown synchronously
function getReferenceColumnsSync(template: EntityTemplate): EntityTemplate[] {
  const entityName = template.referenceName;
  return referenceColumnsMap.value[entityName]?.map(col => ({
    key: col.key,
    name: col.name,
    type: col.type || 'string',
    length: col.length || 255,
    default: col.default || null,
    isPrimaryKey: col.isPrimaryKey || false,
    joinColumns: col.joinColumns || [],
    kind: col.kind || '',
    mappedBy: col.mappedBy || '',
    nullable: col.nullable !== undefined ? col.nullable : true,
    referenceName: col.referenceName || '',
    inversedBy: col.inversedBy || '',
    isRequired: col.isRequired || false,
    isAutoIncrement: col.isAutoIncrement || false,
    isSystem: col.isSystem || false,
    isReference: col.isReference || false,
  })) ?? [];
}

// Ensure reference columns are loaded for a template
async function ensureReferenceColumns(template: EntityTemplate): Promise<EntityTemplate[] | undefined> {
  const entityName = template.referenceName;
  if (!referenceColumnsMap.value[entityName]) {
    const templates = await ApiService.findAll<{ name: string; isSystem?: boolean; isAutoIncrement?: boolean; isReference?: boolean }[]>(`template/${entityName}`);
    referenceColumnsMap.value[entityName] = templates
      .filter(t => !t.isSystem && t.isAutoIncrement === false && !t.isReference)
      .map(t => ({
        key: t.name,
        type: 'string',
        length: 255,
        default: null,
        isPrimaryKey: false,
        joinColumns: [],
        kind: '',
        mappedBy: '',
        nullable: true,
        referenceName: '',
        inversedBy: '',
        isRequired: false,
        isAutoIncrement: false,
        isSystem: false,
        isReference: false,
        ...t
      }));
  }
  return referenceColumnsMap.value[entityName];
}

// Load reference entity data with pagination and search
async function fetchReferenceData(
  template: EntityTemplate,
  { search, page, pageSize }: { search: string; page: number; pageSize: number }
): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const entityName = template.referenceName;
  let filter: Record<string, unknown> = {};
  const columns = getReferenceColumnsSync(template);
  if (search) {
    filter = {
      $or: columns.map(col => ({ [col.key]: { $like: `%${search}%` } }))
    };
  }
  const result = await ApiGenericService.find<unknown>(
    entityName, { filter, page, limit: pageSize }
  );
  return {
    items: result.data as Record<string, unknown>[],
    total: result.meta.total
  };
}

// Handle dialog visibility update
function onDialogUpdate(val: boolean): void {
  emit('update:modelValue', val);
}

// Cancel button handler
function cancel(): void {
  emit('update:modelValue', false);
  emit('cancel');
}

// Save form handler
async function save(): Promise<void> {
  const result = await formRef.value?.validate();
  if (!result || result.valid === false) return;
  const output = { ...form.value };
  props.templates?.forEach(t => {
    if (t.type === 'datetime') {
      const date = form.value[t.name + '_date'];
      const time = form.value[t.name + '_time'];
      output[t.name] = date && time ? `${date}T${time}` : '';
      delete output[t.name + '_date'];
      delete output[t.name + '_time'];
    }
  });
  emit('update:modelValue', false);
  emit('save', output);
}

// #endregion

// #region Lifecycle
// Load all reference columns on mount
onMounted(async () => {
  isLoading.value = true;
  for (const template of props.templates) {
    if (template.isReference) {
      await ensureReferenceColumns(template);
    }
  }
  isLoading.value = false;
});

// Watch for template changes to reload reference columns
watch(
  () => props.templates,
  async (newTemplates) => {
    for (const template of newTemplates) {
      if (template.isReference) {
        await ensureReferenceColumns(template);
      }
    }
  },
  { immediate: false }
);

// Watch for item/mode/template changes to initialize form
watch(() => [props.item, props.mode, props.templates], initializeForm, { immediate: true });
// #endregion
</script>
