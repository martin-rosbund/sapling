<template>
  <v-dialog
    v-model="isOpen"
    max-width="640"
    scrollable
    transition="dialog-top-transition"
    content-class="sapling-help-dialog__overlay"
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
        <section class="sapling-help-dialog__section">
          <h3 class="sapling-help-dialog__section-title">
            {{ t('global.help.shortcutsTitle') }}
          </h3>
          <ul class="sapling-help-dialog__list">
            <li v-for="entry in shortcutEntries" :key="entry.id" class="sapling-help-dialog__row">
              <span class="sapling-help-dialog__keys">
                <kbd v-for="key in entry.keys" :key="key">{{ key }}</kbd>
              </span>
              <span class="sapling-help-dialog__row-label">{{ entry.label }}</span>
            </li>
          </ul>
        </section>

        <v-divider />

        <section class="sapling-help-dialog__section">
          <h3 class="sapling-help-dialog__section-title">
            {{ t('global.help.commandsTitle') }}
          </h3>
          <p class="sapling-help-dialog__section-intro">
            {{ t('global.help.commandsIntro') }}
          </p>
          <ul class="sapling-help-dialog__list">
            <li v-for="entry in commandEntries" :key="entry.id" class="sapling-help-dialog__row">
              <v-icon size="20" class="sapling-help-dialog__row-icon">{{ entry.icon }}</v-icon>
              <div class="sapling-help-dialog__row-stack">
                <span class="sapling-help-dialog__row-label">{{ entry.label }}</span>
                <span v-if="entry.hint" class="sapling-help-dialog__row-hint">
                  {{ entry.hint }}
                </span>
              </div>
            </li>
          </ul>
        </section>

        <v-divider />

        <section class="sapling-help-dialog__section">
          <h3 class="sapling-help-dialog__section-title">
            {{ t('global.help.syntaxTitle') }}
          </h3>
          <p class="sapling-help-dialog__section-intro">
            {{ t('global.help.syntaxIntro') }}
          </p>
          <ul class="sapling-help-dialog__list">
            <li
              v-for="entry in syntaxEntries"
              :key="entry.id"
              class="sapling-help-dialog__row sapling-help-dialog__row--syntax"
            >
              <code class="sapling-help-dialog__example">{{ entry.example }}</code>
              <div class="sapling-help-dialog__row-stack">
                <span class="sapling-help-dialog__row-label">{{ entry.label }}</span>
                <span v-if="entry.hint" class="sapling-help-dialog__row-hint">
                  {{ entry.hint }}
                </span>
              </div>
            </li>
          </ul>
        </section>
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
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSaplingHelp } from '@/composables/system/useSaplingHelp'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'

const { t } = useI18n()

const { isOpen, openSaplingHelp, closeSaplingHelp } = useSaplingHelp()
const { hasSaplingAiChatAccess } = useSaplingAiChat()

interface ShortcutEntry {
  id: string
  keys: string[]
  label: string
}

interface CommandEntry {
  id: string
  icon: string
  label: string
  hint?: string
}

interface SyntaxEntry {
  id: string
  example: string
  label: string
  hint?: string
}

const isMacLike = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)
const cmdLabel = isMacLike ? '⌘' : 'Ctrl'

const shortcutEntries = computed<ShortcutEntry[]>(() => [
  {
    id: 'palette-ctrl',
    keys: [cmdLabel, 'K'],
    label: t('global.help.shortcutPalette'),
  },
  {
    id: 'palette-slash',
    keys: ['/'],
    label: t('global.help.shortcutPaletteSlash'),
  },
  {
    id: 'help',
    keys: ['F1'],
    label: t('global.help.shortcutHelp'),
  },
  {
    id: 'navigate',
    keys: ['↑', '↓'],
    label: t('global.help.shortcutNavigate'),
  },
  {
    id: 'open',
    keys: ['Enter'],
    label: t('global.help.shortcutEnter'),
  },
  {
    id: 'close',
    keys: ['Esc'],
    label: t('global.help.shortcutEscape'),
  },
])

const syntaxEntries = computed<SyntaxEntry[]>(() => [
  {
    id: 'entity-search',
    example: t('global.help.syntaxEntitySearchExample'),
    label: t('global.help.syntaxEntitySearchLabel'),
    hint: t('global.help.syntaxEntitySearchHint'),
  },
  {
    id: 'entity-prefix',
    example: t('global.help.syntaxEntityPrefixExample'),
    label: t('global.help.syntaxEntityPrefixLabel'),
    hint: t('global.help.syntaxEntityPrefixHint'),
  },
  {
    id: 'free-text',
    example: t('global.help.syntaxFreeTextExample'),
    label: t('global.help.syntaxFreeTextLabel'),
    hint: t('global.help.syntaxFreeTextHint'),
  },
])

const commandEntries = computed<CommandEntry[]>(() => {
  const entries: CommandEntry[] = [
    {
      id: 'favorites',
      icon: 'mdi-star',
      label: t('global.commandPalette.favorites'),
      hint: t('global.help.commandFavoritesHint'),
    },
    {
      id: 'entities',
      icon: 'mdi-shape',
      label: t('global.commandPalette.entities'),
      hint: t('global.help.commandEntitiesHint'),
    },
  ]

  if (hasSaplingAiChatAccess.value) {
    entries.push({
      id: 'aiChat',
      icon: 'mdi-robot-outline',
      label: t('global.commandPalette.actionAiChat'),
      hint: t('global.help.commandAiChatHint'),
    })
  }

  entries.push(
    {
      id: 'issue',
      icon: 'mdi-bug-outline',
      label: t('global.commandPalette.actionIssue'),
      hint: t('global.help.commandIssueHint'),
    },
    {
      id: 'help',
      icon: 'mdi-help-circle-outline',
      label: t('global.commandPalette.actionHelp'),
      hint: t('global.help.commandHelpHint'),
    },
    {
      id: 'theme',
      icon: 'mdi-theme-light-dark',
      label: t('global.commandPalette.actionThemeHint'),
      hint: t('global.help.commandThemeHint'),
    },
    {
      id: 'glass',
      icon: 'mdi-blur',
      label: t('global.commandPalette.actionGlassHint'),
      hint: t('global.help.commandGlassHint'),
    },
    {
      id: 'tilt',
      icon: 'mdi-image-filter-tilt-shift',
      label: t('global.commandPalette.actionTiltHint'),
      hint: t('global.help.commandTiltHint'),
    },
    {
      id: 'language',
      icon: 'mdi-translate',
      label: t('global.commandPalette.actionLanguageHint'),
      hint: t('global.help.commandLanguageHint'),
    },
    {
      id: 'logout',
      icon: 'mdi-logout',
      label: t('login.logout'),
      hint: t('global.help.commandLogoutHint'),
    },
  )

  return entries
})

function close() {
  closeSaplingHelp()
}

function open() {
  openSaplingHelp()
}

/**
 * Global F1 shortcut. We deliberately do NOT require the user to focus a
 * specific surface — pressing F1 anywhere outside of an editable element
 * opens the help. Inside inputs we still intercept F1 because browsers do
 * not assign meaningful behavior to F1 in form fields.
 */
function onKeyDown(event: KeyboardEvent) {
  if (event.repeat) {
    return
  }
  if (event.key !== 'F1') {
    return
  }
  // Esc-style closing when already open.
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

<style scoped>
.sapling-help-dialog {
  display: flex;
  flex-direction: column;
  max-height: min(640px, 85vh);
  overflow: hidden;
}

.sapling-help-dialog__title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 600;
}

.sapling-help-dialog__title-icon {
  opacity: 0.85;
}

.sapling-help-dialog__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 4px 0;
}

.sapling-help-dialog__section {
  padding: 12px 16px;
}

.sapling-help-dialog__section-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}

.sapling-help-dialog__section-intro {
  margin: 0 0 10px;
  font-size: 13px;
  opacity: 0.75;
}

.sapling-help-dialog__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sapling-help-dialog__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 14px;
}

.sapling-help-dialog__row-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}

.sapling-help-dialog__row-icon {
  flex: 0 0 auto;
  opacity: 0.85;
}

.sapling-help-dialog__row-label {
  flex: 1 1 auto;
  min-width: 0;
}

.sapling-help-dialog__row-hint {
  font-size: 12px;
  opacity: 0.65;
}

.sapling-help-dialog__keys {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 90px;
  flex: 0 0 auto;
}

.sapling-help-dialog__keys kbd {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 4px;
  font-size: 11px;
  line-height: 14px;
  font-family: inherit;
  opacity: 0.85;
}

.sapling-help-dialog__row--syntax {
  align-items: flex-start;
}

.sapling-help-dialog__example {
  flex: 0 0 auto;
  min-width: 110px;
  padding: 3px 8px;
  border: 1px solid currentColor;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 16px;
  opacity: 0.85;
  white-space: nowrap;
}

.sapling-help-dialog__footer {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  font-size: 11px;
  opacity: 0.6;
}
</style>

<!--
  Anchor the help dialog near the top of the viewport, mirroring the command
  palette so both shell overlays feel consistent.
-->
<style>
.sapling-help-dialog__overlay {
  align-self: flex-start;
  margin-top: 12vh;
}
</style>
