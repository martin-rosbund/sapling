<template>
  <v-menu
    :model-value="modelValue"
    location="bottom end"
    :offset="12"
    :close-on-content-click="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        class="sapling-profile-trigger text-none"
        :class="{ 'sapling-profile-trigger--impersonating': isImpersonating }"
        variant="text"
      >
        <div class="sapling-identity-chip sapling-header__account">
          <div class="sapling-identity-avatar sapling-header__account-avatar">
            <v-icon v-if="isImpersonating" icon="mdi-eye-outline" size="18" />
            <template v-else>{{ profileInitials }}</template>
          </div>
          <div class="sapling-identity-copy sapling-header__account-copy">
            <div class="sapling-identity-title sapling-header__account-name">{{ profileName }}</div>
            <div class="sapling-identity-meta sapling-header__account-meta">
              <template v-if="isImpersonating && impersonationActorName">
                {{ impersonationActorLabel }}
              </template>
              <template v-else>{{ profileMeta }}</template>
            </div>
          </div>
          <v-icon icon="mdi-chevron-down" size="18" />
        </div>
      </v-btn>
    </template>

    <SaplingSurface
      :as="VCard"
      class="sapling-menu-panel sapling-profile-menu"
      :class="{ 'sapling-profile-menu--impersonating': isImpersonating }"
      :elevation="12"
    >
      <div class="sapling-menu-hero sapling-profile-menu__hero">
        <div class="sapling-menu-avatar sapling-profile-menu__avatar">{{ profileInitials }}</div>
        <div class="sapling-menu-identity sapling-profile-menu__identity">
          <div class="sapling-menu-eyebrow sapling-profile-menu__eyebrow">
            {{ accountLabel }}
          </div>
          <div class="sapling-menu-title sapling-profile-menu__name">{{ profileName }}</div>
          <div class="sapling-menu-meta sapling-profile-menu__meta">{{ profileMeta }}</div>
        </div>

        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          :aria-label="closeLabel"
          @click="emit('update:modelValue', false)"
        />
      </div>

      <div class="sapling-menu-panel__body sapling-profile-menu__body">
        <div
          class="sapling-menu-section sapling-profile-menu__section sapling-profile-menu__section--primary"
        >
          <v-btn
            v-if="isImpersonating"
            block
            color="error"
            variant="tonal"
            prepend-icon="mdi-account-arrow-left-outline"
            :loading="impersonationReturning"
            @click="emit('returnToOwnAccount')"
          >
            {{ impersonationReturnLabel }}
          </v-btn>

          <v-btn
            block
            color="primary"
            variant="tonal"
            prepend-icon="mdi-account-circle-outline"
            @click="emit('openAccount')"
          >
            {{ accountLabel }}
          </v-btn>

          <v-btn
            v-if="issueAction"
            block
            variant="text"
            prepend-icon="mdi-bug-outline"
            @click="emit('openIssue')"
          >
            {{ issueAction.label }}
          </v-btn>
        </div>

        <div class="sapling-menu-section sapling-profile-menu__section">
          <button
            v-for="action in appearanceActions"
            :key="action.key"
            type="button"
            class="sapling-menu-option sapling-profile-menu__option"
            :class="{
              'sapling-menu-option--active': action.isActive,
              'sapling-profile-menu__option--active': action.isActive,
            }"
            @click="action.handler()"
          >
            <span class="sapling-menu-option__icon sapling-profile-menu__option-icon">
              <v-icon :icon="action.icon" />
            </span>
            <span class="sapling-menu-option__copy sapling-profile-menu__option-copy">
              {{ action.label }}
            </span>
            <span class="sapling-menu-option__state sapling-profile-menu__option-state">
              <v-icon
                :icon="action.isActive ? 'mdi-check-circle' : 'mdi-chevron-right'"
                size="18"
              />
            </span>
          </button>
        </div>

        <div class="sapling-menu-section sapling-profile-menu__section">
          <div class="sapling-menu-section-label sapling-profile-menu__section-label">
            {{ languageLabel }}
          </div>
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
              @click="emit('setLanguage', language.key)"
            >
              {{ language.label }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <div
          v-if="adminActions.length"
          class="sapling-menu-section sapling-profile-menu__section sapling-profile-menu__section--danger"
        >
          <div
            class="sapling-menu-section-label sapling-profile-menu__section-label sapling-profile-menu__section-label--danger"
          >
            {{ dangerZoneLabel }}
          </div>
          <button
            v-for="action in adminActions"
            :key="action.key"
            type="button"
            class="sapling-menu-option sapling-menu-option--danger sapling-profile-menu__option sapling-profile-menu__option--danger"
            @click="emit('runAdminAction', action)"
          >
            <span
              class="sapling-menu-option__icon sapling-menu-option__icon--danger sapling-profile-menu__option-icon sapling-profile-menu__option-icon--danger"
            >
              <v-icon :icon="action.icon" />
            </span>
            <span class="sapling-menu-option__copy sapling-profile-menu__option-copy">
              {{ action.label }}
            </span>
            <span class="sapling-menu-option__state sapling-profile-menu__option-state">
              <v-icon icon="mdi-chevron-right" size="18" />
            </span>
          </button>
        </div>
      </div>
    </SaplingSurface>
  </v-menu>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { VCard } from 'vuetify/components'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import type {
  SaplingLanguage,
  SaplingLanguageOption,
  SaplingPreferenceAction,
} from '@/composables/system/useSaplingPreferences'
import type { SaplingProfileAction } from '@/components/system/header/header.types'

const props = defineProps<{
  modelValue: boolean
  isImpersonating: boolean
  impersonationActorName: string
  impersonationReturning: boolean
  profileName: string
  profileMeta: string
  profileInitials: string
  currentLanguage: SaplingLanguage
  languageOptions: SaplingLanguageOption[]
  issueAction: SaplingPreferenceAction | null
  appearanceActions: SaplingPreferenceAction[]
  adminActions: SaplingProfileAction[]
  dangerZoneLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  returnToOwnAccount: []
  openAccount: []
  openIssue: []
  runAdminAction: [action: SaplingProfileAction]
  setLanguage: [language: SaplingLanguage]
}>()

const { t } = useI18n()

const accountLabel = computed(() => t('login.account'))
const closeLabel = computed(() => t('global.close'))
const languageLabel = computed(() => t('navigation.language'))
const impersonationReturnLabel = computed(() => t('permission.impersonationReturn'))
const impersonationActorLabel = computed(() =>
  t('permission.impersonationActor', { actor: props.impersonationActorName }),
)
</script>
