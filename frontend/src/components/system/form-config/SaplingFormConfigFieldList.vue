<template>
  <div class="sapling-config-field-tools sapling-form-config__field-tools">
    <v-text-field
      v-model="fieldSearch"
      density="comfortable"
      prepend-inner-icon="mdi-magnify"
      :label="t('global.search')"
      hide-details
    />
    <v-btn
      prepend-icon="mdi-eye-check-outline"
      variant="text"
      :disabled="fields.length === 0"
      @click="emit('showAll')"
    >
      {{ t('formConfig.showAll') }}
    </v-btn>
    <v-btn
      prepend-icon="mdi-restore"
      variant="text"
      :disabled="fields.length === 0"
      @click="emit('reset')"
    >
      {{ t('filter.reset') }}
    </v-btn>
  </div>

  <div
    class="sapling-scroll-list sapling-config-field-list sapling-form-config__field-list"
    role="list"
  >
    <SaplingSurface
      as="article"
      v-for="field in filteredFieldRows"
      :key="field.name"
      class="sapling-panel-shell sapling-stack-md sapling-config-field sapling-form-config-field"
      role="listitem"
    >
      <div class="sapling-row-md sapling-config-field__main sapling-form-config-field__main">
        <v-switch
          v-model="field.visible"
          color="primary"
          hide-details
          density="compact"
          :label="t('formConfig.formVisible')"
          :aria-label="t('formConfig.formVisible')"
        />
        <div>
          <strong>{{ getFieldLabel(field.name) }}</strong>
          <span>{{ field.name }} - {{ field.type }}</span>
        </div>
      </div>

      <div class="sapling-config-field__controls sapling-form-config-field__controls">
        <v-text-field
          v-model="field.label"
          class="sapling-config-field__control sapling-config-field__control--label"
          density="compact"
          hide-details
          :label="t('formConfig.label')"
        />
        <v-text-field
          v-model="field.placeholder"
          class="sapling-config-field__control sapling-config-field__control--placeholder"
          density="compact"
          hide-details
          :label="t('formConfig.placeholder')"
        />
        <v-text-field
          v-model="field.group"
          class="sapling-config-field__control"
          density="compact"
          hide-details
          :label="t('formConfig.group')"
        />
        <v-number-input
          v-model="field.order"
          class="sapling-config-field__control"
          density="compact"
          hide-details
          :label="t('formConfig.formOrder')"
        />
        <v-number-input
          v-model="field.tableOrder"
          class="sapling-config-field__control"
          density="compact"
          hide-details
          :label="t('formConfig.tableOrder')"
        />
        <v-number-input
          v-model="field.mobileOrder"
          class="sapling-config-field__control"
          density="compact"
          hide-details
          :label="t('formConfig.mobileOrder')"
        />
        <SaplingStaticSelect
          v-model="field.width"
          class="sapling-config-field__control"
          density="compact"
          :items="widthOptions"
          :label="t('formConfig.width')"
        />
        <SaplingStaticSelect
          v-model="field.renderer"
          class="sapling-config-field__control"
          density="compact"
          :items="rendererOptions"
          :label="t('formConfig.renderer')"
        />
      </div>

      <div class="sapling-row-md sapling-config-field__toggles sapling-form-config-field__toggles">
        <v-checkbox
          v-model="field.required"
          density="compact"
          hide-details
          :label="t('formConfig.required')"
        />
        <v-checkbox
          v-model="field.tableVisible"
          density="compact"
          hide-details
          :label="t('formConfig.tableVisible')"
        />
        <v-checkbox
          v-model="field.mobileVisible"
          density="compact"
          hide-details
          :label="t('formConfig.mobileVisible')"
        />
        <v-checkbox
          v-model="field.readonly"
          density="compact"
          hide-details
          :label="t('formConfig.readonly')"
        />
      </div>
    </SaplingSurface>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EntityTemplateFormWidth, SaplingFormRenderer } from '@/entity/structure'
import SaplingStaticSelect from '@/components/common/SaplingStaticSelect.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import type { FieldDraft, StaticOption } from './formConfigAdmin.types'

const props = defineProps<{
  fields: FieldDraft[]
  widthOptions: StaticOption<EntityTemplateFormWidth>[]
  rendererOptions: StaticOption<SaplingFormRenderer>[]
  resolveFieldLabel: (fieldName: string) => string
}>()

const emit = defineEmits<{
  (event: 'showAll'): void
  (event: 'reset'): void
}>()

const { t } = useI18n()
const fieldSearch = ref('')

const filteredFieldRows = computed(() => {
  const query = fieldSearch.value.trim().toLowerCase()
  if (!query) {
    return props.fields
  }

  return props.fields.filter((field) =>
    [field.name, field.label, field.group, field.type].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(query),
    ),
  )
})

function getFieldLabel(fieldName: string): string {
  return props.resolveFieldLabel(fieldName)
}
</script>
