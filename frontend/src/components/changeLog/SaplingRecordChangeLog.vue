<template>
  <v-dialog v-if="dialog" v-model="dialogModel" persistent class="sapling-dialog-large">
    <SaplingDialogCard class="sapling-inbox-dialog sapling-record-change-log-dialog">
      <SaplingDialogShell
        fill-shell
        body-class="sapling-inbox-dialog__body sapling-record-change-log-dialog__body"
        :show-divider="false"
      >
        <template #hero>
          <SaplingDialogHero
            v-if="isLoading"
            loading
            :loading-stats-count="3"
            :stats-columns="3"
            stats-layout="compact"
          />
          <SaplingDialogHero
            v-else
            :eyebrow="t('changeLog.title')"
            :title="heroTitle"
            :stats="heroStats"
            :stats-columns="3"
            stats-layout="compact"
          />
        </template>

        <template #body>
          <div class="sapling-inbox-dialog__content sapling-record-change-log sapling-scrollable">
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

            <section v-else class="sapling-record-change-log__list">
              <article
                v-for="entry in visibleEntries"
                :key="entry.handle"
                class="sapling-record-change-log__entry glass-panel"
              >
                <header class="sapling-record-change-log__entry-header">
                  <div class="sapling-record-change-log__entry-meta">
                    <v-chip
                      size="small"
                      variant="tonal"
                      color="primary"
                      :prepend-icon="getActionIcon(entry.action)"
                    >
                      {{ getActionLabel(entry.action) }}
                    </v-chip>
                  </div>

                  <div class="sapling-record-change-log__entry-caption">
                    <span>{{ getPersonLabel(entry) }}</span>
                    <span>{{ formatTimestamp(entry.createdAt) }}</span>
                  </div>
                </header>

                <div
                  v-if="entry.details.length > 0"
                  class="sapling-record-change-log__detail-table"
                  role="table"
                >
                  <div
                    class="sapling-record-change-log__detail-row sapling-record-change-log__detail-row--head"
                  >
                    <span>{{ t('changeLog.property') }}</span>
                    <span>{{ t('changeLog.oldValue') }}</span>
                    <span>{{ t('changeLog.newValue') }}</span>
                  </div>

                  <div
                    v-for="detail in entry.details"
                    :key="`${entry.handle}-${detail.property}`"
                    class="sapling-record-change-log__detail-row"
                    role="row"
                  >
                    <strong>{{ getPropertyLabel(detail.property) }}</strong>
                    <pre>{{ formatDetailValue(detail.oldValue) }}</pre>
                    <pre>{{ formatDetailValue(detail.newValue) }}</pre>
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
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { ChangeLogAction, ChangeLogEntry } from '@/entity/structure'
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import { useSaplingRecordChangeLog } from '@/composables/changeLog/useSaplingRecordChangeLog'
import { useChangeLogDialogStore } from '@/stores/changeLogDialogStore'
import { formatDateTimeValue } from '@/utils/saplingFormatUtil'

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

const heroTitle = computed(() => {
  const translationKey = `navigation.${entity.value?.handle ?? ''}`
  const translated = entity.value?.handle ? t(translationKey) : ''
  return `${translated}`
})

const heroStats = computed(() => [
  { label: t('changeLog.record'), value: `#${recordHandle.value}` },
  { label: t('changeLog.entries'), value: visibleEntries.value.length },
  {
    label: t('changeLog.latest'),
    value: visibleEntries.value[0] ? formatTimestamp(visibleEntries.value[0].createdAt) : '-',
  },
])

const systemProperties = computed(() => {
  return new Set(
    entityTemplates.value
      .filter((template) => template.options?.includes('isSystem'))
      .map((template) => template.name),
  )
})

const visibleEntries = computed(() =>
  entries.value.map((entry) => ({
    ...entry,
    details: entry.details.filter((detail) => !systemProperties.value.has(detail.property)),
  })),
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

function formatTimestamp(value?: string | null): string {
  return value ? formatDateTimeValue(value) : ''
}

function formatDetailValue(value: unknown): string {
  if (value == null) {
    return '-'
  }

  if (typeof value === 'string') {
    return value
  }

  return JSON.stringify(value, null, 2)
}
</script>
