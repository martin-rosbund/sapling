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
            :eyebrow="$t('favorite.loadTemplate')"
            :title="$t('favorite.templatePickerTitle')"
          />
        </template>

        <template #body>
          <div class="sapling-account-dialog__content sapling-dashboard-template-dialog__content">
            <p class="sapling-dashboard-template-dialog__copy text-medium-emphasis">
              {{ $t('favorite.templatePickerText') }}
            </p>

            <section
              v-if="templates.length === 0"
              class="sapling-dashboard-template-empty-state glass-panel"
            >
              <div class="sapling-dashboard-template-empty-state__icon">
                <v-icon icon="mdi-view-list-outline" size="40" />
              </div>
              <h3 class="sapling-dashboard-template-empty-state__title">
                {{ $t('favorite.templateEmptyTitle') }}
              </h3>
              <p class="sapling-dashboard-template-empty-state__copy">
                {{ $t('favorite.templateEmptyText') }}
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
                    <p class="sapling-dashboard-template-entry__description text-medium-emphasis">
                      {{ getEntityLabel(template) }}
                    </p>
                  </div>

                  <v-btn
                    color="primary"
                    variant="flat"
                    :disabled="template.handle == null || busy"
                    :loading="busyTemplateHandle === template.handle"
                    @click="emit('select', template)"
                  >
                    {{ $t('favorite.templateLoadAction') }}
                  </v-btn>
                </div>

                <div class="sapling-dashboard-template-entry__meta">
                  <v-chip
                    v-if="template.isRecommended"
                    size="small"
                    variant="tonal"
                    color="primary"
                  >
                    {{ $t('favorite.templateRecommended') }}
                  </v-chip>

                  <v-chip size="small" variant="outlined" color="default">
                    {{ getEntityLabel(template) }}
                  </v-chip>
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
import type { FavoriteTemplateItem } from '@/entity/entity'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: boolean
  templates: FavoriteTemplateItem[]
  busy?: boolean
  busyTemplateHandle?: FavoriteTemplateItem['handle']
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'select', value: FavoriteTemplateItem): void
}>()

const { t, te } = useI18n()

const templates = computed(() => props.templates ?? [])
const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

function getEntityLabel(template: FavoriteTemplateItem): string {
  const entityHandle =
    typeof template.entity === 'string' ? template.entity : (template.entity?.handle ?? '')
  const translationKey = `navigation.${entityHandle}`

  if (entityHandle && te(translationKey)) {
    return t(translationKey)
  }

  return entityHandle || t('navigation.entity')
}

function handleClose() {
  dialog.value = false
}
</script>
