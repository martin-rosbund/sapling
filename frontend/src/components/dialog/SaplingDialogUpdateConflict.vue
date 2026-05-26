<template>
  <SaplingDialogConfirm
    :model-value="modelValue && Boolean(conflict)"
    size="large"
    :tilt="false"
    card-class="sapling-update-conflict-dialog sapling-dialog-card--fullscreen"
    :loading="isTranslationLoading"
    :eyebrow="$t('updateConflict.eyebrow')"
    :title="$t('updateConflict.title')"
    persistent
    @update:model-value="handleDialogUpdate"
    @enter="merge"
    @escape="cancel"
  >
    <template #hero-meta>
      <v-chip size="small" color="warning" variant="tonal" prepend-icon="mdi-alert-outline">
        {{ conflictCountLabel }}
      </v-chip>
      <v-chip
        v-if="latestChangeLabel"
        size="small"
        variant="outlined"
        prepend-icon="mdi-account-clock-outline"
      >
        {{ latestChangeLabel }}
      </v-chip>
    </template>

    <template #body>
      <div class="sapling-update-conflict">
        <p class="sapling-update-conflict__summary">
          {{ $t('updateConflict.summary') }}
        </p>

        <div class="sapling-update-conflict__fields">
          <section
            v-for="field in visibleFields"
            :key="field.property"
            class="sapling-update-conflict__field"
            :class="{ 'sapling-update-conflict__field--conflict': field.conflict }"
          >
            <div class="sapling-update-conflict__field-header">
              <div>
                <h3>{{ getPropertyLabel(field.property) }}</h3>
                <span>{{ field.property }}</span>
              </div>
              <v-chip
                size="small"
                :color="field.conflict ? 'warning' : 'primary'"
                variant="tonal"
                :prepend-icon="field.conflict ? 'mdi-alert-circle-outline' : 'mdi-merge'"
              >
                {{
                  field.conflict ? $t('updateConflict.conflict') : $t('updateConflict.mergeable')
                }}
              </v-chip>
            </div>

            <v-btn-toggle
              v-model="selectedSources[field.property]"
              class="sapling-update-conflict__toggle"
              color="primary"
              density="comfortable"
              divided
              mandatory
            >
              <v-btn value="current" prepend-icon="mdi-cloud-outline" class="glass-panel">
                {{ $t('updateConflict.currentVersion') }}
              </v-btn>
              <v-btn value="attempted" prepend-icon="mdi-account-edit-outline" class="glass-panel">
                {{ $t('updateConflict.yourVersion') }}
              </v-btn>
            </v-btn-toggle>

            <div class="sapling-update-conflict__values">
              <div
                class="sapling-update-conflict__value"
                :class="{
                  'sapling-update-conflict__value--selected':
                    selectedSources[field.property] === 'current',
                }"
              >
                <span>{{ $t('updateConflict.currentVersion') }}</span>
                <SaplingChangeLogDetailValue
                  :entity-handle="conflict?.entityHandle ?? entityHandle"
                  :template="getTemplate(field.property)"
                  :value="field.currentValue"
                  :payload="conflict?.current ?? null"
                />
              </div>
              <div
                class="sapling-update-conflict__value"
                :class="{
                  'sapling-update-conflict__value--selected':
                    selectedSources[field.property] === 'attempted',
                }"
              >
                <span>{{ $t('updateConflict.yourVersion') }}</span>
                <SaplingChangeLogDetailValue
                  :entity-handle="conflict?.entityHandle ?? entityHandle"
                  :template="getTemplate(field.property)"
                  :value="field.attemptedValue"
                  :payload="conflict?.attempted ?? null"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>

    <template #actions>
      <SaplingActionBar>
        <template #leading>
          <v-btn variant="text" prepend-icon="mdi-close" :disabled="isSaving" @click="cancel">
            <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
          </v-btn>
          <v-btn
            variant="text"
            prepend-icon="mdi-history"
            :disabled="isSaving || !conflict"
            @click="openChangeLog"
          >
            <template v-if="$vuetify.display.mdAndUp">{{ $t('global.changeLog') }}</template>
          </v-btn>
        </template>

        <template #trailing>
          <v-btn
            variant="text"
            prepend-icon="mdi-refresh"
            :disabled="isSaving"
            @click="reloadCurrent"
          >
            <template v-if="$vuetify.display.mdAndUp">
              {{ $t('updateConflict.loadCurrent') }}
            </template>
          </v-btn>
          <v-btn
            color="primary"
            append-icon="mdi-source-merge"
            :loading="isSaving"
            :disabled="!conflict"
            @click="merge"
          >
            <template v-if="$vuetify.display.mdAndUp">
              {{ $t('updateConflict.mergeAndSave') }}
            </template>
          </v-btn>
        </template>
      </SaplingActionBar>
    </template>
  </SaplingDialogConfirm>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import type {
  GenericUpdateConflictDetails,
  GenericUpdateConflictField,
} from '@/services/api.generic.service'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'
import SaplingChangeLogDetailValue from '@/components/changeLog/SaplingChangeLogDetailValue.vue'
import SaplingDialogConfirm from '@/components/dialog/SaplingDialogConfirm.vue'

type ConflictSource = 'current' | 'attempted'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    conflict: GenericUpdateConflictDetails | null
    entityHandle: string
    entityTemplates: EntityTemplate[]
    isSaving?: boolean
  }>(),
  {
    isSaving: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'merge', value: SaplingGenericItem): void
  (event: 'reload'): void
  (event: 'openChangeLog'): void
}>()

const { t, d, te } = useI18n()
const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'updateConflict')
const selectedSources = ref<Record<string, ConflictSource>>({})

const visibleFields = computed<GenericUpdateConflictField[]>(() =>
  (props.conflict?.fields ?? []).filter(
    (field) =>
      (field.changedInCurrent || field.changedInAttempt || field.conflict) &&
      !areConflictValuesEmptyEquivalent(field),
  ),
)

const conflictCountLabel = computed(() => {
  const conflictCount = props.conflict?.conflictingProperties.length ?? 0
  if (conflictCount > 0) {
    return t('updateConflict.conflictCount', { count: conflictCount }, conflictCount)
  }

  return t('updateConflict.mergeableCount', {
    count: props.conflict?.mergeableProperties.length ?? 0,
  })
})

const latestChangeLabel = computed(() => {
  const latestChange = props.conflict?.latestChange
  if (!latestChange) {
    return ''
  }

  const person = formatPersonLabel(latestChange.person)
  const dateLabel = formatDate(latestChange.createdAt)
  return [person, dateLabel].filter(Boolean).join(' - ')
})

watch(
  () => props.conflict,
  (conflict) => {
    const nextSources: Record<string, ConflictSource> = {}
    ;(conflict?.fields ?? []).forEach((field) => {
      nextSources[field.property] = field.changedInAttempt ? 'attempted' : 'current'
    })
    selectedSources.value = nextSources
  },
  { immediate: true },
)

function getTemplate(property: string): EntityTemplate | null {
  return props.entityTemplates.find((template) => template.name === property) ?? null
}

function getPropertyLabel(property: string): string {
  const entityKey = props.entityHandle ? `${props.entityHandle}.${property}` : ''
  if (entityKey && te(entityKey)) {
    return t(entityKey)
  }

  const globalKey = `global.${property}`
  return te(globalKey) ? t(globalKey) : property
}

function areConflictValuesEmptyEquivalent(field: GenericUpdateConflictField): boolean {
  const values = [field.baseValue, field.currentValue, field.attemptedValue]
  return values.every(isEmptyConflictValue)
}

function isEmptyConflictValue(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim().length === 0)
}

function formatPersonLabel(person: unknown): string {
  if (!person || typeof person !== 'object') {
    return ''
  }

  const record = person as Record<string, unknown>
  const name = [record.firstName, record.lastName]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ')

  return name || (typeof record.email === 'string' ? record.email : '')
}

function formatDate(value: unknown): string {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : d(date)
}

function buildMergedItem(): SaplingGenericItem {
  const merged: SaplingGenericItem = {
    ...(props.conflict?.current ?? {}),
  }

  visibleFields.value.forEach((field) => {
    const source = selectedSources.value[field.property] ?? 'current'
    merged[field.property] = source === 'attempted' ? field.attemptedValue : field.currentValue
  })

  return merged
}

function handleDialogUpdate(value: boolean): void {
  if (!value) {
    cancel()
    return
  }

  emit('update:modelValue', true)
}

function cancel(): void {
  emit('update:modelValue', false)
}

function merge(): void {
  if (!props.conflict || props.isSaving) {
    return
  }

  emit('merge', buildMergedItem())
}

function reloadCurrent(): void {
  if (props.isSaving) {
    return
  }

  emit('reload')
}

function openChangeLog(): void {
  if (!props.conflict || props.isSaving) {
    return
  }

  emit('openChangeLog')
}
</script>
