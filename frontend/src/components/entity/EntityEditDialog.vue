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
                v-for="template in templates.filter(x => !x.isSystem && !x.isAutoIncrement && !['1:m', 'm:n'].includes(x.kind || '') && (!x.isPrimaryKey || mode === 'create'))"
                :key="template.key"
                cols="12" sm="6" md="4" lg="3">
                <ReferenceDropdown
                  v-if="template.isReference"
                  :label="$t(`${entity?.handle}.${template.name}`)"
                  :columns="getReferenceColumnsSync(template)"
                  :fetchReferenceData="(params) => fetchReferenceData(template, params)"
                  :template="template"
                  v-model="form[template.name]"
                />
                <v-text-field
                  v-else-if="template.type === 'number'"
                  :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                  v-model.number="form[template.name]"
                  type="number"
                  :disabled="template.isPrimaryKey && mode === 'edit'"
                  :required="template.nullable === false"
                  :placeholder="template.default ?? ''"
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
                  :placeholder="template.default ?? ''"
                  :rules="getRules(template)"
                />
                <v-textarea
                  v-else-if="template.length > 128"
                  :label="$t(`${entity?.handle}.${template.name}`) + (template.isRequired ? '*' : '')"
                  v-model="form[template.name]"
                  :maxlength="template.length"
                  :disabled="template.isPrimaryKey && mode === 'edit'"
                  :required="template.nullable === false"
                  :placeholder="template.default ?? ''"
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
                  :placeholder="template.default ?? ''"
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
import type { EntityTemplate } from '@/entity/structure';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import ReferenceDropdown from './ReferenceDropdown.vue';
import type { EntityItem } from '@/entity/entity';

const props = defineProps<{
  modelValue: boolean,
  mode: 'create' | 'edit',
  item: any | null,
  templates: EntityTemplate[]
  entity: EntityItem | null,
}>();

const emit = defineEmits(['update:modelValue', 'save', 'cancel']);

const requiredRule = (label: string) => (v: any) =>
  v !== null && v !== undefined && v !== '' ? true : `${label} ist erforderlich`;

function getRules(template: EntityTemplate) {
  const rules = [];
  if (template.isRequired) {
    rules.push(requiredRule(i18n.global.t(`${props.entity?.handle}.${template.name}`)));
  }
  // Weitere Regeln (z.B. für Länge, Typ) können hier ergänzt werden
  return rules;
}

// Build form state from templates and item/defaults
const form = ref<Record<string, any>>({});
const formRef = ref();
const isLoading = ref(true);

// Map: template.name => columns[]
const referenceColumnsMap = ref<Record<string, { key: string, name: string }[]>>({});

async function ensureReferenceColumns(template: EntityTemplate) {
  const entityName = template.referenceName;
  if (!referenceColumnsMap.value[entityName]) {
    const templates = await ApiService.findAll<any[]>(`template/${entityName}`);
    referenceColumnsMap.value[entityName] = templates
      .filter(t => !t.isSystem && !t.isAutoIncrement && !t.isReference)
      .map(t => ({
        key: t.name,
        name: t.name
      }));
  }
  return referenceColumnsMap.value[entityName];
}

// Wrapper für Dropdown: gibt synchron Array zurück (oder leeres Array, falls noch nicht geladen)
function getReferenceColumnsSync(template: EntityTemplate) {
  const entityName = template.name;
  return referenceColumnsMap.value[entityName] ?? [];
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

// Lädt die Daten der Referenz-Entität paginiert und mit Suche
async function fetchReferenceData(template: EntityTemplate, { search, page, pageSize }: { search: string, page: number, pageSize: number }) {
  const entityName = template.referenceName; // z.B. "LanguageItem"
  // Filter für Volltextsuche auf allen Feldern
  let filter = {};
  const columns = getReferenceColumnsSync(template);
  if (search) {
    filter = {
      $or: columns.map(col => ({ [col.key]: { $like: `%${search}%` } }))
    };
  }
  // Hole die Daten paginiert
  const result = await ApiGenericService.find<any>(
    entityName,
    filter,
    {},
    page,
    pageSize
  );
  return {
    items: result.data,
    total: result.meta.total
  };
}

function initializeForm() {
  form.value = {};
  props.templates?.forEach(t => {
    if (props.mode === 'edit' && props.item) {
      form.value[t.name] = props.item[t.name] ?? t.default ?? '';
    } else {
      form.value[t.name] = t.default ?? (t.type === 'boolean' ? false : '');
    }
  });
}

watch(() => [props.item, props.mode, props.templates], initializeForm, { immediate: true });

function onDialogUpdate(val: boolean) {
  emit('update:modelValue', val);
}

function cancel() {
  emit('update:modelValue', false);
  emit('cancel');
}

async function save() {
  // Vuetify 3: validate() gibt { valid: boolean } zurück
  const result = await formRef.value?.validate?.();
  if (!result || result.valid === false) return;
  emit('update:modelValue', false);
  emit('save', { ...form.value });
}
</script>
