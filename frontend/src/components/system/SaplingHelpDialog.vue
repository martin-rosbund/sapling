<template>
  <v-dialog
    v-model="isOpen"
    max-width="640"
    scrollable
    transition="dialog-top-transition"
    content-class="sapling-overlay-content--top"
  >
    <v-card class="sapling-help-dialog glass-panel" rounded="lg">
      <v-card-title class="sapling-help-dialog__title">
        <v-icon size="22" class="sapling-help-dialog__title-icon">mdi-help-circle-outline</v-icon>
        <span>{{ t('global.help.title') }}</span>
        <v-spacer />
        <v-btn
          variant="text"
          density="comfortable"
          icon="mdi-close"
          :aria-label="t('global.close')"
          @click="close"
        />
      </v-card-title>

      <v-divider />

      <div class="sapling-help-dialog__body">
        <SaplingHelpSection :title="t('global.help.shortcutsTitle')">
          <SaplingHelpShortcutList :entries="shortcutEntries" />
        </SaplingHelpSection>

        <v-divider />

        <SaplingHelpSection
          :title="t('global.help.commandsTitle')"
          :intro="t('global.help.commandsIntro')"
        >
          <SaplingHelpEntryList :entries="commandEntries" />
        </SaplingHelpSection>

        <v-divider />

        <SaplingHelpSection
          :title="t('global.help.syntaxTitle')"
          :intro="t('global.help.syntaxIntro')"
        >
          <SaplingHelpEntryList :entries="syntaxEntries" />
        </SaplingHelpSection>
      </div>

      <v-divider />

      <div class="sapling-help-dialog__footer">
        <span class="sapling-help-dialog__footer-hint">
          {{ t('global.help.footerHint') }}
        </span>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingHelpEntryList from '@/components/system/help-dialog/SaplingHelpEntryList.vue'
import SaplingHelpSection from '@/components/system/help-dialog/SaplingHelpSection.vue'
import SaplingHelpShortcutList from '@/components/system/help-dialog/SaplingHelpShortcutList.vue'
import { useSaplingHelpEntries } from '@/composables/system/useSaplingHelpEntries'
import { useSaplingHelp } from '@/composables/system/useSaplingHelp'

const { t } = useI18n()
const { isOpen, openSaplingHelp, closeSaplingHelp } = useSaplingHelp()
const { shortcutEntries, commandEntries, syntaxEntries } = useSaplingHelpEntries()

function close() {
  closeSaplingHelp()
}

function open() {
  openSaplingHelp()
}

function onKeyDown(event: KeyboardEvent) {
  if (event.repeat) {
    return
  }
  if (event.key !== 'F1') {
    return
  }

  event.preventDefault()
  if (isOpen.value) {
    close()
    return
  }

  open()
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>
