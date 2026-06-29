<template>
  <v-dialog v-model="visibleModel" max-width="900">
    <SaplingDialogCard
      v-if="valueMapping && field"
      class="sapling-import__value-mapping-dialog"
      :close="() => emit('close')"
    >
      <v-card-title class="sapling-section-header">
        <div>
          <p class="sapling-eyebrow">{{ t('import.valueMapping') }}</p>
          <h2 class="sapling-section-title">{{ fieldLabel(field.name) }}</h2>
        </div>
        <v-spacer />
        <v-btn
          variant="text"
          size="small"
          density="comfortable"
          icon="mdi-close"
          :aria-label="t('global.close')"
          :title="t('global.close')"
          @click="emit('close')"
        />
      </v-card-title>
      <v-card-text class="sapling-import__value-mapping-body">
        <v-select
          :model-value="valueMapping.fallback"
          :items="valueMappingFallbackOptions"
          item-title="title"
          item-value="value"
          density="comfortable"
          prepend-inner-icon="mdi-call-split"
          :label="t('import.valueMappingFallback')"
          autocomplete="off"
          @update:model-value="updateFallback"
        />

        <v-table density="compact" class="sapling-import__table">
          <thead>
            <tr>
              <th>{{ t('import.sourceValue') }}</th>
              <th>{{ t('import.targetValue') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sourceValue in sourceValues" :key="sourceValue">
              <td>{{ sourceValue }}</td>
              <td>
                <SaplingImportTemplateValueField
                  :model-value="valueMapping.values[sourceValue]"
                  :template="field"
                  :entity-handle="selectedEntityHandle ?? ''"
                  :visible-templates="visibleTemplates"
                  :permissions="permissions"
                  :reference-items="referenceItems"
                  @update:model-value="updateMappedValue(sourceValue, $event)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>

        <p v-if="sourceValues.length === 0" class="sapling-muted-text">
          {{ t('import.valueMappingNoValues') }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-delete-outline" @click="emit('clear')">
          {{ t('import.clearValueMapping') }}
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="emit('close')">
          {{ t('global.close') }}
        </v-btn>
      </v-card-actions>
    </SaplingDialogCard>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingImportTemplateValueField from '@/components/import/SaplingImportTemplateValueField.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import type { ImportValueMappingFallback } from '@/services/api.import.service'
import type { SaplingGenericItem } from '@/entity/entity'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'

type ValueMappingState = {
  targetField: string
  values: Record<string, unknown>
  fallback: ImportValueMappingFallback
}

const props = defineProps<{
  visible: boolean
  valueMapping: ValueMappingState | null
  field: EntityTemplate | undefined
  sourceValues: string[]
  selectedEntityHandle: string | null
  visibleTemplates: EntityTemplate[]
  permissions: AccumulatedPermission[]
  referenceItems: Record<string, SaplingGenericItem | null | undefined>
  fieldLabel: (fieldName: string) => string
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'clear'): void
  (event: 'close'): void
  (event: 'updateFallback', value: ImportValueMappingFallback): void
  (event: 'updateMappedValue', sourceValue: string, value: unknown): void
}>()

const { t } = useI18n()

const visibleModel = computed({
  get: () => props.visible,
  set: (value: boolean) => {
    emit('update:visible', value)
    if (!value) {
      emit('close')
    }
  },
})

const valueMappingFallbackOptions = computed(() => [
  { title: t('import.valueMappingFallback.keep'), value: 'keep' },
  { title: t('import.valueMappingFallback.empty'), value: 'empty' },
  { title: t('import.valueMappingFallback.error'), value: 'error' },
])

function updateFallback(value: unknown): void {
  emit(
    'updateFallback',
    value === 'empty' || value === 'error' || value === 'keep' ? value : 'keep',
  )
}

function updateMappedValue(sourceValue: string, value: unknown): void {
  emit('updateMappedValue', sourceValue, value)
}
</script>
