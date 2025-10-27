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
            <v-row dense>
              <v-col
                v-for="template in templates.filter(x =>
                  !x.isSystem &&
                  !x.isAutoIncrement &&
                  !['1:m', 'm:n'].includes(x.kind || '') &&
                  (!x.isPrimaryKey || mode === 'create') &&
                  (!x.isReference || showReference)
                )"
                :key="template.key"
                cols="12" sm="6" md="4" lg="3">
                <ReferenceDropdown
                  v-if="template.isReference && showReference"
                  :label="$t(`${entity?.handle}.${template.name}`)"
                  :columns="getReferenceColumnsSync(template)"
                  :fetchReferenceData="(params) => fetchReferenceData(template, params)"
                  :template="template"
                  :model-value="getReferenceModelValue(form[template.name])"
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
                  :label="$t(`${entity?.handle}.${template.name}`)"
                  v-model="form[template.name]"
                  :disabled="template.isPrimaryKey && mode === 'edit'"
                />
                <v-date-input
                  v-else-if="template.type === 'datetime' || template.type === 'date'"
                  :label="$t(`${entity?.handle}.${template.name}`)"
                  v-model="form[template.name]"
                  :disabled="template.isPrimaryKey && mode === 'edit'"
                />
                <v-time-picker
                  v-else-if="template.type === 'time'"
                  :label="$t(`${entity?.handle}.${template.name}`)"
                  v-model="form[template.name]"
                  :disabled="template.isPrimaryKey && mode === 'edit'"
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

import { defineProps, defineEmits, ref, watch, onMounted } from 'vue';
import type { Ref } from 'vue';
import type { EntityTemplate, FormType } from '@/entity/structure';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import ReferenceDropdown from '../entity/SaplingEntityRowDropdown.vue';
import type { EntityItem } from '@/entity/entity';


const props = defineProps<{
  modelValue: boolean;
  mode: 'create' | 'edit';
  item: FormType | null;
  templates: EntityTemplate[];
  entity: EntityItem | null;
  showReference?: boolean;
}>();

// Helper to guarantee correct type for ReferenceDropdown modelValue
function getReferenceModelValue(val: unknown): Record<string, unknown> | null {
  return (val !== undefined && typeof val === 'object' && val !== null) ? val as Record<string, unknown> : null;
}

const showReference = props.showReference !== false;

const emit = defineEmits(['update:modelValue', 'save', 'cancel']);


const requiredRule = (label: string) => (v: unknown) =>
  v !== null && v !== undefined && v !== '' ? true : `${label} ${i18n.global.t('global.isRequired')}`;


function getRules(template: EntityTemplate): Array<(v: unknown) => true | string> {
  const rules: Array<(v: unknown) => true | string> = [];
  if (template.isRequired) {
    rules.push(requiredRule(i18n.global.t(`${props.entity?.handle}.${template.name}`)));
  }
  // Additional rules (e.g., for length, type) can be added here
  return rules;
}

// Build form state from templates and item/defaults
const form: Ref<FormType> = ref({});
// Vuetify v-form exposes a validate() method, so we define a type for the form ref
type VuetifyFormRef = {
  validate: () => Promise<{ valid: boolean } | undefined>;
};
const formRef: Ref<VuetifyFormRef | null> = ref(null);
const isLoading = ref(true);

// Map: template.referenceName => columns[]
const referenceColumnsMap: Ref<Record<string, EntityTemplate[]>> = ref({});

async function ensureReferenceColumns(template: EntityTemplate): Promise<EntityTemplate[] | undefined> {
  const entityName = template.referenceName;
  if (!referenceColumnsMap.value[entityName]) {
    const templates = await ApiService.findAll<{ name: string; isSystem?: boolean; isAutoIncrement?: boolean; isReference?: boolean }[]>(`template/${entityName}`);
    referenceColumnsMap.value[entityName] = templates
      .filter(t => !t.isSystem && t.isAutoIncrement === false && !t.isReference)
      .map(t => ({
        key: t.name,
        type: 'string', // Default or inferred type
        length: 255, // Default or inferred length
        default: null, // Default value
        isPrimaryKey: false, // Default value for missing property
        joinColumns: [], // Default value for missing property
        kind: '', // Default value for missing property
        mappedBy: '', // Default value for missing property
        nullable: true, // Default value for missing property
        referenceName: '', // Default value for missing property
        inversedBy: '', // Default value for missing property
        isRequired: false, // Default value for missing property
        isAutoIncrement: false, // Explicitly set default value
        isSystem: false, // Explicitly set default value
        isReference: false, // Explicitly set default value
        ...t // Spread other properties
      }));
  }
  return referenceColumnsMap.value[entityName];
}


// Wrapper for Dropdown: returns array or empty array if not loaded
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

// Lade alle Referenz-Spalten beim Mount
onMounted(async () => {
  isLoading.value = true;
  for (const template of props.templates) {
    if (template.isReference) {
      await ensureReferenceColumns(template);
    }
  }
  isLoading.value = false;
});

// Neu: Watch auf Templates, damit Referenz-Spalten nachgeladen werden!
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


// Loads reference entity data with pagination and search
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
  // Fetch paginated data
  const result = await ApiGenericService.find<unknown>(
    entityName, { filter, page, limit: pageSize }
  );
  return {
    items: result.data as Record<string, unknown>[],
    total: result.meta.total
  };
}


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
          } else {
            if (props.mode === 'edit' && props.item) {
              form.value[t.name] = props.item[t.name] ?? t.default ?? '';
            } else {
              form.value[t.name] = t.default ?? (t.type === 'boolean' ? false : '');
            }
          }
        });
}

watch(() => [props.item, props.mode, props.templates], initializeForm, { immediate: true });


function onDialogUpdate(val: boolean): void {
  emit('update:modelValue', val);
}

function cancel(): void {
  emit('update:modelValue', false);
  emit('cancel');
}

async function save(): Promise<void> {
  // Vuetify 3: validate() returns { valid: boolean }
  const result = await formRef.value?.validate();
  if (!result || result.valid === false) return;
  emit('update:modelValue', false);
  emit('save', { ...form.value });
}
</script>
