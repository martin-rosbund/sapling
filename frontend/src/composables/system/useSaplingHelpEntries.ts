import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  HelpListEntry,
  HelpShortcutEntry,
} from '@/components/system/help-dialog/helpDialog.types'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'

export function useSaplingHelpEntries() {
  const { t } = useI18n()
  const { hasSaplingAiChatAccess } = useSaplingAiChat()

  const isMacLike = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)
  const cmdLabel = isMacLike ? '\u2318' : 'Ctrl'

  const shortcutEntries = computed<HelpShortcutEntry[]>(() => [
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
      keys: ['\u2191', '\u2193'],
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

  const syntaxEntries = computed<HelpListEntry[]>(() => [
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

  const commandEntries = computed<HelpListEntry[]>(() => {
    const entries: HelpListEntry[] = [
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

  return {
    shortcutEntries,
    commandEntries,
    syntaxEntries,
  }
}
