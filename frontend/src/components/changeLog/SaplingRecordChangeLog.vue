<template>
  <v-dialog v-if="dialog" v-model="dialogModel" persistent class="sapling-dialog-large">
    <SaplingDialogCard class="sapling-inbox-dialog sapling-history-dialog sapling-record-change-log-dialog" :tilt="false">
      <SaplingDialogShell
        fill-shell
        body-class="sapling-dialog-fill-body sapling-inbox-dialog__body sapling-history-dialog__body sapling-record-change-log-dialog__body"
        :show-divider="false"
      >
        <template #hero>
          <SaplingDialogHero
            v-if="isLoading"
            loading
            :loading-stats-count="2"
            :stats-columns="2"
            stats-layout="compact"
          />
          <SaplingDialogHero
            v-else
            :eyebrow="t('changeLog.title')"
            :title="heroTitle"
            :stats="heroStats"
            :stats-columns="2"
            stats-layout="compact"
          />
        </template>

        <template #body>
          <div
            class="sapling-dialog-fill-content sapling-inbox-dialog__content sapling-stack-lg sapling-record-change-log sapling-scrollable"
          >
            <section
              v-if="error"
              class="sapling-record-change-log__empty glass-panel sapling-empty-state-panel"
            >
              <v-icon size="42">mdi-alert-circle-outline</v-icon>
              <p>{{ error }}</p>
            </section>

            <section
              v-else-if="!isLoading && entries.length === 0"
              class="sapling-record-change-log__empty glass-panel sapling-empty-state-panel"
            >
              <v-icon size="42">mdi-history</v-icon>
              <p>{{ t('changeLog.empty') }}</p>
            </section>

            <section v-else class="sapling-stack-lg sapling-record-change-log__list">
              <article
                v-for="entry in visibleEntries"
                :key="entry.handle"
                class="sapling-section-panel sapling-section-panel--compact sapling-record-change-log__entry glass-panel"
              >
                <header class="sapling-row-between-md sapling-row-wrap sapling-record-change-log__entry-header">
                  <div class="sapling-chip-row sapling-record-change-log__entry-meta">
                    <v-chip
                      size="small"
                      variant="tonal"
                      color="primary"
                      :prepend-icon="getActionIcon(entry.action)"
                    >
                      {{ getActionLabel(entry.action) }}
                    </v-chip>
                  </div>

                  <div class="sapling-chip-row sapling-record-change-log__entry-caption">
                    <span>{{ getPersonLabel(entry) }}</span>
                    <span>{{ formatTimestamp(entry.createdAt) }}</span>
                  </div>
                </header>

                <div
                  v-if="entry.details.length > 0"
                  class="sapling-history-detail-table sapling-record-change-log__detail-table"
                  role="table"
                >
                  <div
                    class="sapling-history-detail-row sapling-history-detail-row--head sapling-record-change-log__detail-row sapling-record-change-log__detail-row--head"
                  >
                    <span>{{ t('changeLog.property') }}</span>
                    <span>{{ t('changeLog.oldValue') }}</span>
                    <span>{{ t('changeLog.newValue') }}</span>
                  </div>

                  <div
                    v-for="detail in entry.details"
                    :key="`${entry.handle}-${detail.property}`"
                    class="sapling-history-detail-row sapling-record-change-log__detail-row"
                    role="row"
                  >
                    <strong>{{ getPropertyLabel(detail.property) }}</strong>
                    <SaplingChangeLogDetailValue
                      :entity-handle="entity?.handle ?? ''"
                      :template="getPropertyTemplate(detail.property)"
                      :value="detail.oldValue"
                      :payload="entry.oldPayload"
                    />
                    <SaplingChangeLogDetailValue
                      :entity-handle="entity?.handle ?? ''"
                      :template="getPropertyTemplate(detail.property)"
                      :value="detail.newValue"
                      :payload="entry.newPayload"
                    />
                  </div>
                </div>

                <p v-else class="sapling-record-change-log__no-details">
                  {{ t('changeLog.noDetails') }}
                </p>
              </article>
            </section>
          </div>
        </template>

        <template #actions>
          <SaplingActionClose :close="closeDialog" />
        </template>
      </SaplingDialogShell>
    </SaplingDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import '@/assets/styles/SaplingRecordChangeLog.css'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { SaplingGenericItem } from '@/entity/entity'
import type { ChangeLogAction, ChangeLogEntry, EntityTemplate } from '@/entity/structure'
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingChangeLogDetailValue from '@/components/changeLog/SaplingChangeLogDetailValue.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import { useSaplingRecordChangeLog } from '@/composables/changeLog/useSaplingRecordChangeLog'
import { useChangeLogDialogStore } from '@/stores/changeLogDialogStore'
import { formatDateTimeValue } from '@/utils/saplingFormatUtil'
import { getEntityValueLabel } from '@/utils/saplingTableUtil'

const { t } = useI18n()
const changeLogDialogStore = useChangeLogDialogStore()
const { dialog, entityHandle, recordHandle } = storeToRefs(changeLogDialogStore)

const dialogModel = computed({
  get: () => dialog.value,
  set: (value: boolean) => {
    if (!value) {
      changeLogDialogStore.closeChangeLog()
    }
  },
})

const { entity, entries, error, isLoading, entityTemplates } = useSaplingRecordChangeLog({
  entityHandle,
  recordHandle,
  active: dialog,
})

const entityLabel = computed(() => {
  const translationKey = `navigation.${entity.value?.handle ?? ''}`
  const translated = entity.value?.handle ? t(translationKey) : ''
  if (translated && translated !== translationKey) {
    return translated
  }

  return entity.value?.title ?? entity.value?.handle ?? t('changeLog.record')
})

const recordSnapshot = computed<SaplingGenericItem | null>(() => {
  for (const entry of entries.value) {
    const snapshot = entry.newPayload ?? entry.oldPayload
    if (snapshot) {
      return snapshot as SaplingGenericItem
    }
  }

  return null
})

const heroTitle = computed(() => {
  return getEntityValueLabel(recordSnapshot.value, entityTemplates.value) || entityLabel.value
})

const heroStats = computed(() => [
  { label: t('changeLog.entries'), value: visibleEntries.value.length },
  {
    label: t('changeLog.latest'),
    value: visibleEntries.value[0] ? formatTimestamp(visibleEntries.value[0].createdAt) : '-',
  },
])

const systemProperties = computed(() => {
  return new Set(
    entityTemplates.value
      .filter(
        (template) =>
          template.options?.includes('isSystem') || template.options?.includes('isReadOnly'),
      )
      .map((template) => template.name),
  )
})

const visibleEntries = computed(() =>
  entries.value.map((entry) => ({
    ...entry,
    details: entry.details.filter((detail) => !systemProperties.value.has(detail.property)),
  })),
)

const templateByName = computed(
  () => new Map(entityTemplates.value.map((template) => [template.name, template])),
)

function closeDialog() {
  changeLogDialogStore.closeChangeLog()
}

function getActionIcon(action: ChangeLogAction): string {
  switch (action) {
    case 'create':
      return 'mdi-plus-circle-outline'
    case 'delete':
      return 'mdi-delete-outline'
    default:
      return 'mdi-pencil-circle-outline'
  }
}

function getActionLabel(action: ChangeLogAction): string {
  const translationKey = `changeLog.action.${action}`
  const translated = t(translationKey)
  return translated !== translationKey ? translated : action
}

function getPersonLabel(entry: ChangeLogEntry): string {
  const firstName = entry.person?.firstName?.trim() ?? ''
  const lastName = entry.person?.lastName?.trim() ?? ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  if (fullName) {
    return fullName
  }

  return entry.person?.email?.trim() || String(entry.person?.handle ?? '-')
}

function getPropertyLabel(property: string): string {
  const entityKey = entity.value?.handle ? `${entity.value.handle}.${property}` : ''
  const translatedEntityKey = entityKey ? t(entityKey) : ''
  if (entityKey && translatedEntityKey !== entityKey) {
    return translatedEntityKey
  }

  const globalKey = `changeLog.${property}`
  const translatedGlobalKey = t(globalKey)
  if (translatedGlobalKey !== globalKey) {
    return translatedGlobalKey
  }

  return property
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
}

function getPropertyTemplate(property: string): EntityTemplate | null {
  return templateByName.value.get(property) ?? null
}

function formatTimestamp(value?: string | null): string {
  return value ? formatDateTimeValue(value) : ''
}
</script>
