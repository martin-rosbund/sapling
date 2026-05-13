<template>
  <!-- Application header bar with navigation and actions -->
  <v-app-bar :elevation="2" class="sapling-header">
    <template #prepend>
      <!-- Navigation drawer toggle button -->
      <v-app-bar-nav-icon @click="toggleNavigation"></v-app-bar-nav-icon>
    </template>

    <v-app-bar-title>
      <div class="sapling-inline-cluster sapling-inline-cluster--wide sapling-header__brand">
        <!-- Home button -->
        <v-btn stacked class="pa-1" @click="goHome">Sapling</v-btn>
      </div>
    </v-app-bar-title>

    <!-- Centered AI button -->
    <div class="sapling-header__center">
      <v-btn
        v-if="hasSaplingAiChatAccess"
        color="primary"
        icon="mdi-robot-happy-outline"
        size="default"
        variant="tonal"
        @click="toggleSaplingAiChat"
      />
    </div>

    <template #append>
      <!-- Message center button with badge -->
      <v-btn class="sapling-header__desktop-action text-none" stacked @click="openMessageCenter">
        <v-badge
          location="top right"
          :color="messageBadgeColor"
          :content="messageCount"
          :value="messageCount > 0"
        >
          <v-icon icon="mdi-cloud-alert"></v-icon>
        </v-badge>
      </v-btn>

      <!-- Inbox button with badge -->
      <div class="sapling-header__inbox-slot">
        <Transition name="sapling-header-inbox-preview">
          <div
            v-if="visibleIncomingInboxPreview"
            class="sapling-header__inbox-preview glass-panel"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div class="sapling-header__inbox-preview-icon">
              <v-icon :icon="visibleIncomingInboxPreview.icon" size="18" />
            </div>
            <div class="sapling-header__inbox-preview-copy">
              <div class="sapling-header__inbox-preview-label">{{ $t('navigation.inbox') }}</div>
              <div class="sapling-header__inbox-preview-title">
                {{ visibleIncomingInboxPreview.title }}
              </div>
            </div>
          </div>
        </Transition>

        <v-btn class="sapling-header__desktop-action text-none" stacked @click="openInbox">
          <v-badge
            location="top right"
            :color="inboxBadgeColor"
            :content="inboxCount"
            :model-value="true"
          >
            <v-icon icon="mdi-email"></v-icon>
          </v-badge>
        </v-btn>
      </div>

      <v-menu location="bottom end" :offset="12">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            class="sapling-header__mobile-overflow"
            icon="mdi-dots-vertical"
            variant="text"
            :aria-label="$t('global.more')"
          />
        </template>

        <v-list class="sapling-header__mobile-overflow-menu glass-panel" density="comfortable" nav>
          <v-list-item :title="$t('global.messageCenter')" @click="openMessageCenter">
            <template #prepend>
              <v-icon icon="mdi-cloud-alert" />
            </template>
            <template #append>
              <v-badge
                :color="messageBadgeColor"
                inline
                :content="messageCount"
                :model-value="messageCount > 0"
              />
            </template>
          </v-list-item>

          <v-list-item :title="$t('global.inbox')" @click="openInbox">
            <template #prepend>
              <v-icon icon="mdi-email" />
            </template>
            <template #append>
              <v-badge
                :color="inboxBadgeColor"
                inline
                :content="inboxCount"
                :model-value="true"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu
        v-model="showProfileMenu"
        location="bottom end"
        :offset="12"
        :close-on-content-click="false"
      >
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" class="sapling-profile-trigger text-none" variant="text">
            <div class="sapling-header__account">
              <div class="sapling-header__account-avatar">{{ profileInitials }}</div>
              <div class="sapling-header__account-copy">
                <div class="sapling-header__account-name">{{ profileName }}</div>
                <div class="sapling-header__account-meta">{{ profileMeta }}</div>
              </div>
              <v-icon icon="mdi-chevron-down" size="18" />
            </div>
          </v-btn>
        </template>

        <v-card class="glass-panel sapling-profile-menu" elevation="12">
          <div class="sapling-profile-menu__hero">
            <div class="sapling-profile-menu__avatar">{{ profileInitials }}</div>
            <div class="sapling-profile-menu__identity">
              <div class="sapling-profile-menu__eyebrow">{{ $t('login.account') }}</div>
              <div class="sapling-profile-menu__name">{{ profileName }}</div>
              <div class="sapling-profile-menu__meta">{{ profileMeta }}</div>
            </div>

            <v-btn
              icon="mdi-close"
              size="small"
              variant="text"
              :aria-label="$t('global.close')"
              @click="showProfileMenu = false"
            />
          </div>

          <div class="sapling-profile-menu__body">
            <div class="sapling-profile-menu__section sapling-profile-menu__section--primary">
              <v-btn
                block
                color="primary"
                variant="tonal"
                prepend-icon="mdi-account-circle-outline"
                @click="openAccountFromProfile"
              >
                {{ $t('login.account') }}
              </v-btn>

              <v-btn
                v-if="issueAction"
                block
                variant="text"
                prepend-icon="mdi-bug-outline"
                @click="openIssueFromProfile"
              >
                {{ issueAction.label }}
              </v-btn>
            </div>

            <div class="sapling-profile-menu__section">
              <button
                v-for="action in appearanceActions"
                :key="action.key"
                type="button"
                class="sapling-profile-menu__option"
                :class="{ 'sapling-profile-menu__option--active': action.isActive }"
                @click="action.handler()"
              >
                <span class="sapling-profile-menu__option-icon">
                  <v-icon :icon="action.icon" />
                </span>
                <span class="sapling-profile-menu__option-copy">{{ action.label }}</span>
                <span class="sapling-profile-menu__option-state">
                  <v-icon
                    :icon="action.isActive ? 'mdi-check-circle' : 'mdi-chevron-right'"
                    size="18"
                  />
                </span>
              </button>
            </div>

            <div class="sapling-profile-menu__section">
              <div class="sapling-profile-menu__section-label">{{ $t('navigation.language') }}</div>
              <v-btn-toggle
                divided
                mandatory
                :model-value="currentLanguage"
                variant="text"
                class="sapling-profile-menu__language-toggle"
              >
                <v-btn
                  v-for="language in languageOptions"
                  :key="language.key"
                  :value="language.key"
                  class="sapling-profile-menu__language-button"
                  @click="setLanguage(language.key)"
                >
                  {{ language.label }}
                </v-btn>
              </v-btn-toggle>
            </div>

            <div
              v-if="adminActions.length"
              class="sapling-profile-menu__section sapling-profile-menu__section--danger"
            >
              <div
                class="sapling-profile-menu__section-label sapling-profile-menu__section-label--danger"
              >
                {{ dangerZoneLabel }}
              </div>
              <button
                v-for="action in adminActions"
                :key="action.key"
                type="button"
                class="sapling-profile-menu__option sapling-profile-menu__option--danger"
                @click="runAdminAction(action)"
              >
                <span
                  class="sapling-profile-menu__option-icon sapling-profile-menu__option-icon--danger"
                >
                  <v-icon :icon="action.icon" />
                </span>
                <span class="sapling-profile-menu__option-copy">{{ action.label }}</span>
                <span class="sapling-profile-menu__option-state">
                  <v-icon icon="mdi-chevron-right" size="18" />
                </span>
              </button>
            </div>
          </div>
        </v-card>
      </v-menu>
    </template>
  </v-app-bar>

  <!-- Inbox dialog -->
  <SaplingInbox v-if="showInbox" @close="closeInbox" />

  <!-- Account dialog -->
  <SaplingAccount v-if="showAccount" @close="closeAccount" />
</template>

<script lang="ts" setup>
// #region Imports
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  useSaplingHeader,
  type SaplingHeaderInboxPreview,
} from '@/composables/system/useSaplingHeader'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useSaplingPreferences } from '@/composables/system/useSaplingPreferences'
import { useSaplingVectorization } from '@/composables/system/useSaplingVectorization'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'
import { BACKEND_URL, GIT_URL } from '@/constants/project.constants'
import { i18n } from '@/i18n'
import SaplingInbox from '@/components/account/SaplingInbox.vue'
import SaplingAccount from '@/components/account/SaplingAccount.vue'
// #endregion

interface SaplingProfileAction {
  key: string
  icon: string
  label: string
  handler: () => void | Promise<void>
}

const router = useRouter()
const showProfileMenu = ref(false)

// #region Props
const props = withDefaults(
  defineProps<{
    modelValue?: boolean
  }>(),
  {
    modelValue: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()
// #endregion

const { messages, getMessageColor, openDialog: openGlobalMessageCenter } = useSaplingMessageCenter()
const messageCount = computed(() => messages.value.length)
const messageBadgeColor = computed(() => {
  const latestMessage = messages.value[0]

  if (!latestMessage) {
    return 'primary'
  }

  return getMessageColor(latestMessage.type)
})
const { toggleSaplingAiChat, hasSaplingAiChatAccess } = useSaplingAiChat()
const { currentLanguage, languageOptions, issueAction, appearanceActions, setLanguage } =
  useSaplingPreferences()
const { toggleSaplingVectorization } = useSaplingVectorization()

function toggleNavigation() {
  emit('update:modelValue', !props.modelValue)
}

function openMessageCenter() {
  openGlobalMessageCenter()
}

function openIssueFromProfile() {
  if (!issueAction.value) {
    return
  }

  showProfileMenu.value = false
  return issueAction.value.handler()
}

function openAccountFromProfile() {
  showProfileMenu.value = false
  openAccount()
}

function runAdminAction(action: SaplingProfileAction) {
  showProfileMenu.value = false
  return action.handler()
}

// #region Composable
const {
  showInbox,
  showAccount,
  inboxCount,
  inboxBadgeColor,
  incomingInboxPreview,
  currentPersonStore,
  openInbox,
  closeInbox,
  openAccount,
  closeAccount,
  goHome,
} = useSaplingHeader()
// #endregion

const visibleIncomingInboxPreview = ref<SaplingHeaderInboxPreview | null>(null)
let incomingInboxPreviewTimeout: number | null = null
let inboxPreviewAudioContext: AudioContext | null = null

watch(
  () => incomingInboxPreview.value?.sequence,
  (sequence) => {
    if (!sequence || !incomingInboxPreview.value) {
      return
    }

    visibleIncomingInboxPreview.value = incomingInboxPreview.value

    if (incomingInboxPreviewTimeout != null) {
      window.clearTimeout(incomingInboxPreviewTimeout)
    }

    incomingInboxPreviewTimeout = window.setTimeout(() => {
      visibleIncomingInboxPreview.value = null
      incomingInboxPreviewTimeout = null
    }, 5000)

    void playInboxPing()
  },
)

async function playInboxPing() {
  if (typeof window === 'undefined') {
    return
  }

  const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
  const audioContextConstructor = window.AudioContext ?? webkitWindow.webkitAudioContext

  if (!audioContextConstructor) {
    return
  }

  try {
    inboxPreviewAudioContext ??= new audioContextConstructor()

    if (inboxPreviewAudioContext.state === 'suspended') {
      await inboxPreviewAudioContext.resume()
    }

    const currentTime = inboxPreviewAudioContext.currentTime
    const oscillator = inboxPreviewAudioContext.createOscillator()
    const gainNode = inboxPreviewAudioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(1046.5, currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(783.99, currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.0001, currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.07, currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.24)

    oscillator.connect(gainNode)
    gainNode.connect(inboxPreviewAudioContext.destination)

    oscillator.start(currentTime)
    oscillator.stop(currentTime + 0.25)
    oscillator.onended = () => {
      oscillator.disconnect()
      gainNode.disconnect()
    }
  } catch {
    // Ignore blocked browser audio playback and keep the visual notification.
  }
}

onBeforeUnmount(() => {
  if (incomingInboxPreviewTimeout != null) {
    window.clearTimeout(incomingInboxPreviewTimeout)
  }

  if (inboxPreviewAudioContext) {
    void inboxPreviewAudioContext.close()
    inboxPreviewAudioContext = null
  }
})

const profileName = computed(() => {
  const person = currentPersonStore.person

  if (!person) {
    return 'Sapling'
  }

  return `${person.firstName} ${person.lastName}`.trim() || 'Sapling'
})

const profileMeta = computed(() => {
  const person = currentPersonStore.person

  return person?.email || person?.loginName || ''
})

const profileInitials = computed(() => {
  const person = currentPersonStore.person

  if (!person) {
    return 'SP'
  }

  const initials = [person.firstName, person.lastName]
    .filter(Boolean)
    .map((value) => value.trim().charAt(0).toUpperCase())
    .join('')

  return initials || 'SP'
})

const hasAdministratorRole = computed(
  () =>
    currentPersonStore.person?.roles?.some((role) => {
      if (!role || typeof role === 'string') {
        return false
      }

      return role.isAdministrator === true
    }) ?? false,
)

const adminActions = computed<SaplingProfileAction[]>(() => {
  if (!hasAdministratorRole.value) {
    return []
  }

  return [
    {
      key: 'system',
      icon: 'mdi-poll',
      label: i18n.global.t('global.systemMonitor'),
      handler: openSystem,
    },
    {
      key: 'vectorization',
      icon: 'mdi-vector-polyline',
      label: i18n.global.t('global.vectorization'),
      handler: openVectorization,
    },
    {
      key: 'playground',
      icon: 'mdi-code-block-braces',
      label: i18n.global.t('global.componentLibrary'),
      handler: openPlayground,
    },
    {
      key: 'swagger',
      icon: 'mdi-api',
      label: i18n.global.t('global.swagger'),
      handler: openSwagger,
    },
    {
      key: 'git',
      icon: 'mdi-git',
      label: i18n.global.t('global.git'),
      handler: openGit,
    },
  ]
})

const dangerZoneLabel = computed(() =>
  currentLanguage.value === 'en' ? 'Danger Zone' : 'Danger Zone',
)

async function openSystem() {
  await router.push('/system')
}

async function openPlayground() {
  await router.push('/playground')
}

async function openVectorization() {
  await toggleSaplingVectorization()
}

function openSwagger() {
  window.open(`${BACKEND_URL}swagger`, '_blank')
}

function openGit() {
  window.open(GIT_URL, '_blank')
}
</script>
