<template>
  <v-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" max-width="1600px" max-height="800px">
    <v-card>
      <v-card-title>
        {{ mode === 'edit' ? $t('editRecord') : $t('createRecord') }}
      </v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="save">
          <v-row dense>
            <v-col
                v-for="template in templates.filter(x => !x.isSystem && !x.isAutoIncrement && !x.isReference)"
              :key="template.key"
              cols="12" sm="6" md="4" lg="3"
              style="margin-bottom: 0;"
            >
                <v-text-field
                v-if="template.type === 'number'"
                :label="$t(template.name) + (template.nullable === false ? ' *' : '')"
                v-model.number="form[template.name]"
                type="number"
                :disabled="template.isPrimaryKey && mode === 'edit'"
                :required="template.nullable === false"
                :placeholder="template.default ?? ''"
                :rules="getRules(template)"
                />
                <v-checkbox
                v-else-if="template.type === 'boolean'"
                :label="$t(template.name)"
                v-model="form[template.name]"
                :disabled="template.isPrimaryKey && mode === 'edit'"
                />
                <v-date-input
                v-else-if="template.type === 'datetime' || template.type === 'date'"
                :label="$t(template.name)"
                v-model="form[template.name]"
                :disabled="template.isPrimaryKey && mode === 'edit'"
                />
                <v-time-picker
                v-else-if="template.type === 'time'"
                :label="$t(template.name)"
                v-model="form[template.name]"
                :disabled="template.isPrimaryKey && mode === 'edit'"
                />
                <v-text-field
                v-else-if="template.type !== 'number' && template.type !== 'boolean' && template.type !== 'datetime' && template.type !== 'date' && template.type !== 'time' && template.length <= 64"
                :label="$t(template.name) + (template.nullable === false ? ' *' : '')"
                v-model="form[template.name]"
                :maxlength="template.length"
                :disabled="template.isPrimaryKey && mode === 'edit'"
                :required="template.nullable === false"
                :placeholder="template.default ?? ''"
                :rules="getRules(template)"
                />
                <v-textarea
                v-else-if="template.length > 128"
                :label="$t(template.name) + (template.nullable === false ? ' *' : '')"
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
                :label="$t(template.name) + (template.nullable === false ? ' *' : '')"
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
          <v-btn text @click="cancel">{{ $t('cancel') }}</v-btn>
          <v-btn color="primary" @click="save">{{ $t('save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits, ref, watch } from 'vue';
import type { EntityTemplate } from '@/entity/structure';
import { i18n } from '@/i18n';

const props = defineProps<{
  modelValue: boolean,
  mode: 'create' | 'edit',
  item: any | null,
  templates: EntityTemplate[]
}>();

const emit = defineEmits(['update:modelValue', 'save', 'cancel']);

const requiredRule = (label: string) => (v: any) =>
  v !== null && v !== undefined && v !== '' ? true : `${label} ist erforderlich`;

function getRules(template: EntityTemplate) {
  const rules = [];
  if (template.nullable === false) {
    rules.push(requiredRule(i18n.global.t(template.name)));
  }
  // Weitere Regeln (z.B. für Länge, Typ) können hier ergänzt werden
  return rules;
}

// Build form state from templates and item/defaults
const form = ref<Record<string, any>>({});
const formRef = ref();

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
