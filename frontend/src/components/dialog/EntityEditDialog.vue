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
import { defineProps, defineEmits } from 'vue';
import SaplingEntityRowDropdown from '../entity/SaplingEntityRowDropdown.vue';
import { useEntityEditDialog } from '@/composables/dialog/useEntityEditDialog';
import type { EntityItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
// #endregion

// #region Props and Emits
const props = defineProps<{
  modelValue: boolean;
  mode: 'create' | 'edit';
  item: any;
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
  getReferenceModelValue,
  getRules,
  getReferenceColumnsSync,
  fetchReferenceData,
  onDialogUpdate,
  cancel,
  save,
} = useEntityEditDialog(props, emit);
// #endregion
</script>
