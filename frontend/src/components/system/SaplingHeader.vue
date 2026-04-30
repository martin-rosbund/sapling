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
        <v-btn stacked class="pl-0" @click="goHome">Sapling</v-btn>
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
      <SaplingMessageCenter ref="messageCenterRef" />

      <!-- Message center button with badge -->
      <v-btn
        class="text-none"
        stacked
        @click="openMessageCenter"
        :class="pulsingType ? `sapling-header__desktop-action text-none message-center-pulse--${pulsingType}` : 'sapling-header__desktop-action text-none'"
      >
        <v-badge
          location="top right"
          color="primary"
          :content="messageCount"
          :value="messageCount > 0"
        >
          <v-icon icon="mdi-cloud-alert"></v-icon>
        </v-badge>
      </v-btn>

      <!-- Inbox button with badge -->
      <v-btn class="sapling-header__desktop-action text-none" stacked @click="openInbox">
        <v-badge location="top right" color="primary" :content="inboxCount">
          <v-icon icon="mdi-email"></v-icon>
        </v-badge>
      </v-btn>

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
                color="primary"
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
              <v-badge color="primary" inline :content="inboxCount" :model-value="inboxCount > 0" />
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSaplingHeader } from '@/composables/system/useSaplingHeader'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useSaplingPreferences } from '@/composables/system/useSaplingPreferences'
import { useSaplingVectorization } from '@/composables/system/useSaplingVectorization'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'
import { BACKEND_URL, GIT_URL } from '@/constants/project.constants'
import { i18n } from '@/i18n'
import SaplingInbox from '@/components/account/SaplingInbox.vue'
import SaplingAccount from '@/components/account/SaplingAccount.vue'
import SaplingMessageCenter from '@/components/system/SaplingMessageCenter.vue'
// #endregion

interface SaplingMessageCenterExposed {
  openDialog: () => void
}

interface SaplingProfileAction {
  key: string
  icon: string
  label: string
  handler: () => void | Promise<void>
}

const router = useRouter()
const messageCenterRef = ref<SaplingMessageCenterExposed | null>(null)
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

const { messages, pulsingType } = useSaplingMessageCenter()
const messageCount = computed(() => messages.value.length)
const { toggleSaplingAiChat, hasSaplingAiChatAccess } = useSaplingAiChat()
const { currentLanguage, languageOptions, issueAction, appearanceActions, setLanguage } =
  useSaplingPreferences()
const { toggleSaplingVectorization } = useSaplingVectorization()

function toggleNavigation() {
  emit('update:modelValue', !props.modelValue)
}

function openMessageCenter() {
  messageCenterRef.value?.openDialog()
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
  currentPersonStore,
  openInbox,
  closeInbox,
  openAccount,
  closeAccount,
  goHome,
} = useSaplingHeader()
// #endregion

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
