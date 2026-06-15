<template>
  <v-dialog v-model="dialogModel" persistent class="sapling-dialog-large">
    <SaplingDialogCard class="sapling-external-record-links-dialog" :tilt="false">
      <SaplingDialogShell
        fill-shell
        body-class="sapling-dialog-fill-body sapling-external-record-links-dialog__body"
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
            :eyebrow="t('externalRecordLink.dialogEyebrow')"
            :title="recordTitle"
            :stats="heroStats"
            :stats-columns="2"
            stats-layout="compact"
          />
        </template>

        <template #body>
          <div
            class="sapling-dialog-fill-content sapling-stack-lg sapling-scrollable sapling-external-record-links-dialog__content"
          >
            <section
              v-if="error"
              class="glass-panel sapling-empty-state-panel sapling-external-record-links-dialog__empty"
            >
              <v-icon size="42">mdi-alert-circle-outline</v-icon>
              <p>{{ error }}</p>
            </section>

            <section
              v-else-if="!isLoading && links.length === 0"
              class="glass-panel sapling-empty-state-panel sapling-external-record-links-dialog__empty"
            >
              <v-icon size="42">mdi-link-off</v-icon>
              <p>{{ t('externalRecordLink.emptyForRecord') }}</p>
            </section>

            <section v-else class="sapling-stack-md sapling-external-record-links-dialog__list">
              <article
                v-for="link in links"
                :key="link.handle"
                class="glass-panel sapling-section-panel sapling-section-panel--compact sapling-external-record-links-dialog__entry"
              >
                <header
                  class="sapling-row-between-md sapling-row-wrap sapling-external-record-links-dialog__entry-header"
                >
                  <div class="sapling-external-record-links-dialog__source">
                    <span>{{ t('externalRecordLink.source') }}</span>
                    <strong>{{ sourceLabel(link) }}</strong>
                  </div>

                  <v-chip
                    size="small"
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-link-variant"
                  >
                    {{ translate('externalRecordLink.linkedByImport', 'Per Import verknüpft') }}
                  </v-chip>
                </header>

                <div class="sapling-external-record-links-dialog__layout">
                  <section class="sapling-external-record-links-dialog__section">
                    <h3>{{ t('externalRecordLink.externalKeyParts') }}</h3>
                    <div class="sapling-external-record-links-dialog__key-grid">
                      <div
                        v-for="part in keyParts(link)"
                        :key="`${link.handle}-${part.key}`"
                        class="sapling-external-record-links-dialog__key"
                      >
                        <span>{{ part.key }}</span>
                        <strong>{{ part.value }}</strong>
                      </div>
                    </div>
                  </section>

                  <section class="sapling-external-record-links-dialog__section">
                    <h3>{{ translate('externalRecordLink.groupImport', 'Import') }}</h3>
                    <div class="sapling-external-record-links-dialog__info-grid">
                      <div
                        v-for="entry in batchEntries(link)"
                        :key="`${link.handle}-${entry.label}`"
                        class="sapling-external-record-links-dialog__field"
                      >
                        <span>{{ entry.label }}</span>
                        <strong>{{ entry.value }}</strong>
                      </div>
                    </div>
                  </section>

                  <section class="sapling-external-record-links-dialog__section">
                    <h3>{{ translate('externalRecordLink.timeline', 'Zeitpunkte') }}</h3>
                    <div class="sapling-external-record-links-dialog__info-grid">
                      <div
                        v-for="entry in timestampEntries(link)"
                        :key="`${link.handle}-${entry.label}`"
                        class="sapling-external-record-links-dialog__field"
                      >
                        <span>{{ entry.label }}</span>
                        <strong>{{ entry.value }}</strong>
                      </div>
                    </div>
                  </section>
                </div>
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
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SaplingGenericItem } from '@/entity/entity'
import ApiGenericService from '@/services/api.generic.service'
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { formatDateTimeValue } from '@/utils/saplingFormatUtil'

interface ExternalRecordLinkSummary extends SaplingGenericItem {
  source?: SaplingGenericItem | string | null
  entity?: SaplingGenericItem | string | null
  reference?: string | null
  externalKeyHash?: string | null
  externalKeyParts?: Record<string, unknown> | null
  firstImportBatch?: SaplingGenericItem | number | null
  lastImportBatch?: SaplingGenericItem | number | null
  lastSeenAt?: string | Date | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

const props = defineProps<{
  show: boolean
  entityHandle: string
  item: SaplingGenericItem | null
}>()

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
  (event: 'close'): void
}>()

const { t, te } = useI18n()
const { loadTranslations } = useTranslationLoader(
  'global',
  'navigation',
  'externalRecordLink',
  'importSource',
  'importBatch',
)

const links = ref<ExternalRecordLinkSummary[]>([])
const isLoading = ref(false)
const error = ref('')

const dialogModel = computed({
  get: () => props.show,
  set: (value: boolean) => {
    emit('update:show', value)
    if (!value) {
      emit('close')
    }
  },
})

const itemHandle = computed(() => {
  const handle = props.item?.handle
  return typeof handle === 'string' || typeof handle === 'number' ? String(handle) : ''
})

const recordTitle = computed(() => {
  const label = getRecordLabel(props.item)
  if (label) {
    return label
  }

  return props.entityHandle
    ? t(`navigation.${props.entityHandle}`)
    : t('externalRecordLink.dialogEyebrow')
})

const heroStats = computed(() => [
  { label: t('externalRecordLink.links'), value: links.value.length },
  { label: translate('externalRecordLink.sources', 'Fremdsysteme'), value: sourceCount.value },
])

const sourceCount = computed(() => new Set(links.value.map((link) => sourceLabel(link))).size)

watch(
  () => [props.show, props.entityHandle, itemHandle.value] as const,
  ([show]) => {
    if (show) {
      void loadLinks()
    }
  },
  { immediate: true },
)

async function loadLinks(): Promise<void> {
  if (!props.show || !props.entityHandle || !itemHandle.value) {
    links.value = []
    return
  }

  try {
    isLoading.value = true
    error.value = ''
    await loadTranslations()
    const response = await ApiGenericService.find<ExternalRecordLinkSummary>('externalRecordLink', {
      filter: {
        entity: { handle: props.entityHandle },
        reference: itemHandle.value,
      },
      orderBy: { updatedAt: 'DESC' },
      limit: 50,
      relations: ['source', 'entity', 'firstImportBatch', 'lastImportBatch'],
    })
    links.value = response.data
  } catch {
    error.value = t('externalRecordLink.loadFailed')
  } finally {
    isLoading.value = false
  }
}

function closeDialog(): void {
  dialogModel.value = false
}

function sourceLabel(link: ExternalRecordLinkSummary): string {
  const source = link.source
  if (source && typeof source === 'object') {
    return String(source.title ?? source.name ?? source.handle ?? '-')
  }

  return source ? String(source) : '-'
}

function batchLabel(batch: SaplingGenericItem | number | null | undefined): string {
  if (!batch) {
    return '-'
  }

  if (typeof batch === 'number') {
    return `#${batch}`
  }

  return String(batch.filename ?? batch.title ?? batch.name ?? `#${batch.handle ?? ''}`)
}

function keyParts(link: ExternalRecordLinkSummary): { key: string; value: string }[] {
  return Object.entries(link.externalKeyParts ?? {}).map(([key, value]) => ({
    key,
    value: value == null ? '-' : String(value),
  }))
}

function batchEntries(link: ExternalRecordLinkSummary): { label: string; value: string }[] {
  const first = batchLabel(link.firstImportBatch)
  const last = batchLabel(link.lastImportBatch)

  if (first === last) {
    return [{ label: translate('externalRecordLink.importBatch', 'Importstapel'), value: first }]
  }

  return [
    { label: t('externalRecordLink.firstImportBatch'), value: first },
    { label: t('externalRecordLink.lastImportBatch'), value: last },
  ]
}

function timestampEntries(link: ExternalRecordLinkSummary): { label: string; value: string }[] {
  const entries = [
    { label: t('global.createdAt'), value: formatDateTime(link.createdAt) },
    { label: t('externalRecordLink.lastSeenAt'), value: formatDateTime(link.lastSeenAt) },
    { label: t('global.updatedAt'), value: formatDateTime(link.updatedAt) },
  ].filter((entry) => entry.value)

  const grouped = new Map<string, string[]>()
  entries.forEach((entry) => {
    grouped.set(entry.value, [...(grouped.get(entry.value) ?? []), entry.label])
  })

  return Array.from(grouped.entries()).map(([value, labels]) => ({
    label:
      labels.length > 1
        ? translate('externalRecordLink.sameTimestamp', 'Alle Zeitpunkte')
        : labels[0],
    value,
  }))
}

function getRecordLabel(item: SaplingGenericItem | null): string {
  if (!item) {
    return ''
  }

  const labelFields = ['name', 'title', 'displayName', 'subject', 'filename', 'email']
  for (const field of labelFields) {
    const value = item[field]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return ''
}

function formatDateTime(value: string | Date | null | undefined): string {
  return value ? formatDateTimeValue(value) : ''
}

function translate(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback
}
</script>

<style scoped>
.sapling-external-record-links-dialog__content {
  gap: 16px;
}

.sapling-external-record-links-dialog__entry {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sapling-external-record-links-dialog__entry-header {
  align-items: flex-start;
  gap: 12px;
}

.sapling-external-record-links-dialog__source {
  display: grid;
  gap: 4px;
}

.sapling-external-record-links-dialog__source span,
.sapling-external-record-links-dialog__field span,
.sapling-external-record-links-dialog__key span {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.sapling-external-record-links-dialog__source strong {
  font-size: 1.35rem;
  line-height: 1.2;
}

.sapling-external-record-links-dialog__layout {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.9fr);
}

.sapling-external-record-links-dialog__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.sapling-external-record-links-dialog__section:first-child {
  grid-row: span 2;
}

.sapling-external-record-links-dialog__section h3 {
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
}

.sapling-external-record-links-dialog__info-grid,
.sapling-external-record-links-dialog__key-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.sapling-external-record-links-dialog__field,
.sapling-external-record-links-dialog__key {
  align-content: start;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 8px;
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px;
}

.sapling-external-record-links-dialog__field strong,
.sapling-external-record-links-dialog__key strong {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .sapling-external-record-links-dialog__layout {
    grid-template-columns: 1fr;
  }

  .sapling-external-record-links-dialog__section:first-child {
    grid-row: auto;
  }
}
</style>
