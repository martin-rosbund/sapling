<template>
  <v-dialog v-if="dialog" v-model="dialog" :persistent="busy" class="sapling-dialog-medium">
    <v-card
      class="glass-panel tilt-content sapling-account-dialog sapling-dashboard-template-dialog"
      v-tilt="TILT_DEFAULT_OPTIONS"
      elevation="12"
    >
      <SaplingDialogShell
        fill-shell
        body-class="sapling-account-dialog__body sapling-dashboard-template-dialog__body"
        :show-divider="false"
      >
        <template #hero>
          <SaplingDialogHero
            :eyebrow="$t('dashboard.loadTemplate')"
            :title="$t('dashboard.templatePickerTitle')"
          />
        </template>

        <template #body>
          <div class="sapling-account-dialog__content sapling-dashboard-template-dialog__content">
            <p class="sapling-dashboard-template-dialog__copy text-medium-emphasis">
              {{ $t('dashboard.templatePickerText') }}
            </p>

            <section
              v-if="templates.length === 0"
              class="sapling-dashboard-template-empty-state glass-panel"
            >
              <div class="sapling-dashboard-template-empty-state__icon">
                <v-icon icon="mdi-view-dashboard-edit-outline" size="40" />
              </div>
              <h3 class="sapling-dashboard-template-empty-state__title">
                {{ $t('dashboard.templateEmptyTitle') }}
              </h3>
              <p class="sapling-dashboard-template-empty-state__copy">
                {{ $t('dashboard.templateEmptyText') }}
              </p>
            </section>

            <div v-else class="sapling-dashboard-template-list">
              <article
                v-for="template in templates"
                :key="template.handle ?? template.name"
                class="sapling-dashboard-template-entry"
              >
                <div class="sapling-dashboard-template-entry__header">
                  <div class="sapling-dashboard-template-entry__title-wrap">
                    <h3 class="sapling-dashboard-template-entry__title">
                      {{ template.name }}
                    </h3>
                    <p
                      v-if="template.description"
                      class="sapling-dashboard-template-entry__description text-medium-emphasis"
                    >
                      {{ template.description }}
                    </p>
                  </div>

                  <v-btn
                    color="primary"
                    variant="flat"
                    :disabled="template.handle == null || busy"
                    :loading="busyTemplateHandle === template.handle"
                    @click="emit('select', template)"
                  >
                    {{ $t('dashboard.templateLoadAction') }}
                  </v-btn>
                </div>

                <div class="sapling-dashboard-template-entry__meta">
                  <v-chip
                    size="small"
                    variant="tonal"
                    :color="template.isShared ? 'primary' : 'default'"
                  >
                    {{
                      template.isShared
                        ? $t('dashboard.templateShared')
                        : $t('dashboard.templatePrivate')
                    }}
                  </v-chip>

                  <v-chip size="small" variant="outlined" color="default">
                    {{ template.kpis?.length ?? 0 }} {{ $t('dashboard.kpis') }}
                  </v-chip>

                  <span
                    v-if="getOwnerLabel(template)"
                    class="sapling-dashboard-template-entry__owner text-medium-emphasis"
                  >
                    {{ getOwnerLabel(template) }}
                  </span>
                </div>
              </article>
            </div>
          </div>
        </template>

        <template #actions>
          <SaplingActionClose :close="handleClose" :disabled="busy" />
        </template>
      </SaplingDialogShell>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import type { DashboardTemplateItem } from '@/entity/entity'
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  templates: DashboardTemplateItem[]
  busy?: boolean
  busyTemplateHandle?: DashboardTemplateItem['handle']
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'select', value: DashboardTemplateItem): void
}>()

const templates = computed(() => props.templates ?? [])
const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

function getOwnerLabel(template: DashboardTemplateItem): string {
  if (!template.person || typeof template.person !== 'object') {
    return ''
  }

  return [template.person.firstName, template.person.lastName].filter(Boolean).join(' ')
}

function handleClose() {
  dialog.value = false
}
</script>

<style>
.sapling-dashboard-template-dialog {
  width: 100%;
}

.sapling-dashboard-template-dialog__body {
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
  gap: var(--sapling-gap-md);
}

.sapling-dashboard-template-dialog__copy {
  margin: 0;
}

.sapling-dashboard-template-dialog__content {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: hidden;
  gap: var(--sapling-gap-md);
}

.sapling-dashboard-template-empty-state {
  display: grid;
  place-items: center;
  gap: var(--sapling-gap-sm);
  min-height: 220px;
  padding: var(--sapling-space-panel-xl);
  text-align: center;
}

.sapling-dashboard-template-empty-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: var(--sapling-surface-fill);
}

.sapling-dashboard-template-empty-state__title,
.sapling-dashboard-template-empty-state__copy {
  margin: 0;
}

.sapling-dashboard-template-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: var(--sapling-gap-md);
}

.sapling-dashboard-template-entry {
  display: grid;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  gap: var(--sapling-gap-md);
  padding: var(--sapling-gap-md);
  border: 1px solid var(--sapling-surface-border-muted);
  border-radius: var(--sapling-radius-md);
  background: var(--sapling-surface-fill);
}

.sapling-dashboard-template-entry__header {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sapling-gap-md);
}

.sapling-dashboard-template-entry__title-wrap {
  min-width: 0;
}

.sapling-dashboard-template-entry__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.sapling-dashboard-template-entry__description {
  margin: 0.25rem 0 0;
}

.sapling-dashboard-template-entry__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sapling-gap-sm);
}

.sapling-dashboard-template-entry__owner {
  font-size: 0.95rem;
}

@media (max-width: 700px) {
  .sapling-dashboard-template-entry__header {
    flex-direction: column;
    align-items: stretch;
  }

  .sapling-dashboard-template-entry__header > .v-btn {
    width: 100%;
  }
}
</style>
