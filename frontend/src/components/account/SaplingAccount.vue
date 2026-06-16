<template>
  <!-- Dialog container for the account -->
  <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-large">
    <SaplingDialogCard class="sapling-account-dialog" :tilt="false">
      <SaplingDialogShell
        fill-shell
        body-class="sapling-account-dialog__body"
        :show-divider="false"
      >
        <template #hero>
          <SaplingDialogHero
            v-if="isLoading || !currentPersonStore.loaded"
            loading
            :loading-stats-count="2"
          />
          <SaplingDialogHero
            v-else
            :eyebrow="$t('login.account')"
            :title="accountTitle"
            :subtitle="accountSubtitle"
          >
            <template #title-trailing>
              <v-btn
                icon="mdi-help-circle-outline"
                variant="text"
                size="small"
                :aria-label="$t('global.contextualHelp')"
                :title="$t('global.contextualHelp')"
                @click="openProfileContextHelp"
              />
            </template>
          </SaplingDialogHero>
        </template>

        <template #body>
          <div
            v-if="isLoading || !currentPersonStore.loaded"
            class="sapling-account-dialog__content"
          >
            <div class="sapling-account-dialog__summary-grid">
              <section class="sapling-account-dialog__details">
                <v-skeleton-loader
                  elevation="12"
                  type="list-item-two-line, list-item-two-line, list-item-two-line"
                />
              </section>
              <section class="sapling-account-dialog__workhours">
                <v-skeleton-loader elevation="12" type="table-heading, table-tbody" />
              </section>
            </div>
          </div>

          <div v-else-if="currentPersonStore.person" class="sapling-account-dialog__content">
            <div class="sapling-account-center">
              <v-tabs
                v-model="activeAccountTab"
                direction="vertical"
                mandatory
                class="sapling-account-center__tabs"
              >
                <v-tab
                  v-for="tab in accountTabs"
                  :key="tab.key"
                  :value="tab.key"
                  class="sapling-account-center__tab"
                >
                  <v-icon :icon="tab.icon" />
                  <span>{{ tab.label }}</span>
                </v-tab>
              </v-tabs>

              <v-window v-model="activeAccountTab" class="sapling-account-center__panels">
                <v-window-item value="profile">
                  <div class="sapling-account-dialog__summary-grid">
                    <section class="sapling-account-dialog__details">
                      <v-list density="comfortable">
                        <v-list-item v-for="detail in accountDetails" :key="detail.key">
                          <div class="sapling-account-dialog__detail-row">
                            <v-icon color="primary">{{ detail.icon }}</v-icon>
                            <span class="sapling-account-dialog__detail-value">
                              {{ detail.value }}
                              <template v-if="detail.suffixKey && detail.value !== '-'">
                                {{ $t(detail.suffixKey) }}
                              </template>
                            </span>
                          </div>
                        </v-list-item>
                      </v-list>
                    </section>
                    <section v-if="workHours" class="sapling-account-dialog__workhours">
                      <div v-if="$vuetify.display.smAndDown" class="sapling-workhours-list mt-4">
                        <article
                          v-for="(workHourRow, index) in workHourRows"
                          :key="workHourRow.key"
                          class="sapling-workhours-card"
                          :class="{ 'sapling-selected-item': currentWeekday === index }"
                        >
                          <div class="sapling-workhours-card__day">
                            {{ $t(`workHourWeek.${workHourRow.key}`) }}
                          </div>
                          <div class="sapling-workhours-card__times">
                            <div class="sapling-workhours-card__time-row">
                              <span class="sapling-workhours-card__label">{{
                                $t('workHour.timeFrom')
                              }}</span>
                              <span>{{ workHourRow.timeFrom }}</span>
                            </div>
                            <div class="sapling-workhours-card__time-row">
                              <span class="sapling-workhours-card__label">{{
                                $t('workHour.timeTo')
                              }}</span>
                              <span>{{ workHourRow.timeTo }}</span>
                            </div>
                          </div>
                        </article>
                      </div>
                      <v-table v-else density="compact" class="sapling-workhours-table mt-4">
                        <thead>
                          <tr>
                            <th>{{ $t('workHour.workTime') }}</th>
                            <th>{{ $t('workHour.timeFrom') }}</th>
                            <th>{{ $t('workHour.timeTo') }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(workHourRow, index) in workHourRows"
                            :key="workHourRow.key"
                            :class="{ 'sapling-selected-item': currentWeekday === index }"
                          >
                            <td>{{ $t(`workHourWeek.${workHourRow.key}`) }}</td>
                            <td>{{ workHourRow.timeFrom }}</td>
                            <td>{{ workHourRow.timeTo }}</td>
                          </tr>
                        </tbody>
                      </v-table>
                    </section>
                    <section class="sapling-account-dialog__panel-stack">
                      <div class="sapling-account-dialog__section-heading">
                        <v-icon color="primary">mdi-account-edit-outline</v-icon>
                        <span>{{ $t('account.editProfile') }}</span>
                      </div>
                      <div class="sapling-account-dialog__profile-grid">
                        <v-text-field
                          v-model="profileForm.firstName"
                          density="comfortable"
                          variant="outlined"
                          hide-details
                          autocomplete="off"
                          :label="$t('person.firstName')"
                        />
                        <v-text-field
                          v-model="profileForm.lastName"
                          density="comfortable"
                          variant="outlined"
                          hide-details
                          autocomplete="off"
                          :label="$t('person.lastName')"
                        />
                        <v-text-field
                          v-model="profileForm.phone"
                          density="comfortable"
                          variant="outlined"
                          hide-details
                          autocomplete="off"
                          :label="$t('person.phone')"
                        />
                        <v-text-field
                          v-model="profileForm.mobile"
                          density="comfortable"
                          variant="outlined"
                          hide-details
                          autocomplete="off"
                          :label="$t('person.mobile')"
                        />
                        <v-text-field
                          v-model="profileForm.color"
                          density="comfortable"
                          variant="outlined"
                          hide-details
                          type="color"
                          autocomplete="off"
                          :label="$t('person.color')"
                        />
                      </div>
                      <v-btn
                        color="primary"
                        variant="flat"
                        prepend-icon="mdi-content-save-outline"
                        :loading="isProfileSaving"
                        @click="saveProfile"
                      >
                        {{ $t('account.saveProfile') }}
                      </v-btn>
                    </section>
                  </div>
                </v-window-item>

                <v-window-item value="notifications">
                  <section class="sapling-account-dialog__panel-stack">
                    <div class="sapling-account-dialog__section-heading">
                      <v-icon color="primary">mdi-bell-outline</v-icon>
                      <span>{{ $t('account.notifications') }}</span>
                    </div>
                    <div class="sapling-account-dialog__notification-grid">
                      <v-switch
                        v-model="notificationPreferences.inboxNotificationsEnabled"
                        color="primary"
                        hide-details
                        inset
                        :label="$t('account.inboxNotificationsEnabled')"
                      />
                      <v-switch
                        v-model="notificationPreferences.openTaskNotificationsEnabled"
                        color="primary"
                        hide-details
                        inset
                        :label="$t('account.openTaskNotificationsEnabled')"
                      />
                      <v-switch
                        v-model="notificationPreferences.badgeChannelEnabled"
                        color="primary"
                        hide-details
                        inset
                        :label="$t('account.badgeChannelEnabled')"
                      />
                      <v-switch
                        v-model="notificationPreferences.previewChannelEnabled"
                        color="primary"
                        hide-details
                        inset
                        :label="$t('account.previewChannelEnabled')"
                      />
                    </div>
                    <v-divider />
                    <div class="sapling-account-dialog__quiet-hours-grid">
                      <v-switch
                        v-model="notificationPreferences.quietHoursEnabled"
                        color="primary"
                        hide-details
                        inset
                        :label="$t('account.quietHoursEnabled')"
                      />
                      <v-text-field
                        v-model="notificationPreferences.quietHoursFrom"
                        density="comfortable"
                        variant="outlined"
                        hide-details
                        type="time"
                        :disabled="!notificationPreferences.quietHoursEnabled"
                        :label="$t('account.quietHoursFrom')"
                      />
                      <v-text-field
                        v-model="notificationPreferences.quietHoursTo"
                        density="comfortable"
                        variant="outlined"
                        hide-details
                        type="time"
                        :disabled="!notificationPreferences.quietHoursEnabled"
                        :label="$t('account.quietHoursTo')"
                      />
                    </div>
                    <v-btn
                      color="primary"
                      variant="flat"
                      prepend-icon="mdi-content-save-outline"
                      :loading="isNotificationPreferencesSaving"
                      @click="saveNotificationPreferenceSelection"
                    >
                      {{ $t('account.saveNotifications') }}
                    </v-btn>
                  </section>
                </v-window-item>

                <v-window-item value="sync">
                  <section v-if="calendarSync" class="sapling-account-dialog__calendar-sync">
                    <div class="sapling-account-dialog__section-heading">
                      <v-icon color="primary">mdi-calendar-sync-outline</v-icon>
                      <span>{{ $t('calendarSyncSubscription.calendarSyncSubscription') }}</span>
                    </div>
                    <template v-if="calendarSync.isAvailable">
                      <div class="sapling-account-dialog__sync-controls">
                        <v-switch
                          v-model="calendarSync.isActive"
                          color="primary"
                          hide-details
                          inset
                          :label="$t('calendarSyncSubscription.isActive')"
                        />
                        <SaplingStaticSelect
                          v-model="calendarSync.syncRange"
                          :items="calendarSyncRangeOptions"
                          :label="$t('calendarSyncSubscription.syncRange')"
                        />
                        <SaplingStaticSelect
                          v-model="calendarSync.intervalMinutes"
                          :items="calendarSyncIntervalOptions"
                          :label="$t('calendarSyncSubscription.intervalMinutes')"
                        />
                        <v-btn
                          color="primary"
                          variant="flat"
                          prepend-icon="mdi-content-save-outline"
                          :loading="isCalendarSyncSaving"
                          @click="saveCalendarSync"
                        >
                          {{ $t('calendarSyncSubscription.save') }}
                        </v-btn>
                      </div>
                      <v-list density="compact" class="sapling-account-dialog__sync-list">
                        <v-list-item v-for="detail in calendarSyncDetails" :key="detail.key">
                          <div class="sapling-account-dialog__detail-row">
                            <v-icon color="primary">{{ detail.icon }}</v-icon>
                            <span class="sapling-account-dialog__detail-value">
                              {{ detail.value }}
                            </span>
                          </div>
                        </v-list-item>
                      </v-list>
                    </template>
                    <div v-else class="sapling-account-dialog__sync-unavailable">
                      {{ $t('calendarSyncSubscription.notAvailable') }}
                    </div>
                  </section>
                </v-window-item>

                <v-window-item value="security">
                  <section class="sapling-account-dialog__panel-stack">
                    <SaplingPasskeyManager v-if="isSaplingAccount" />
                    <v-btn
                      color="primary"
                      variant="tonal"
                      prepend-icon="mdi-form-textbox-password"
                      @click="changePassword"
                    >
                      {{ $t('login.changePassword') }}
                    </v-btn>
                  </section>
                </v-window-item>

                <v-window-item value="sessions">
                  <section class="sapling-account-dialog__panel-stack">
                    <div class="sapling-account-dialog__section-heading">
                      <v-icon color="primary">mdi-devices</v-icon>
                      <span>{{ $t('account.activeSessions') }}</span>
                    </div>
                    <div class="sapling-account-dialog__session-actions">
                      <v-btn
                        color="primary"
                        variant="tonal"
                        prepend-icon="mdi-refresh"
                        :loading="isSessionsLoading"
                        @click="loadCurrentSessions"
                      >
                        {{ $t('global.refresh') }}
                      </v-btn>
                      <v-btn
                        color="error"
                        variant="tonal"
                        prepend-icon="mdi-logout-variant"
                        :loading="isSessionsTerminating"
                        @click="terminateOtherSessions"
                      >
                        {{ $t('account.terminateOtherSessions') }}
                      </v-btn>
                    </div>
                    <v-list
                      v-if="currentSessions.length > 0"
                      density="comfortable"
                      class="sapling-account-dialog__session-list"
                    >
                      <v-list-item v-for="session in currentSessions" :key="session.id">
                        <div class="sapling-account-dialog__session-row">
                          <v-icon color="primary">mdi-web</v-icon>
                          <div class="sapling-account-dialog__session-main">
                            <div class="sapling-account-dialog__session-title">
                              <span>{{ session.deviceLabel }}</span>
                              <v-chip
                                v-if="session.isCurrent"
                                color="primary"
                                size="small"
                                variant="tonal"
                              >
                                {{ $t('account.currentSession') }}
                              </v-chip>
                            </div>
                            <div class="sapling-account-dialog__session-meta">
                              <span>{{ session.id }}</span>
                              <span>
                                {{ $t('account.signedInAt') }}:
                                {{ formatDateTime(session.createdAt) }}
                              </span>
                              <span>
                                {{ $t('account.lastActivityAt') }}:
                                {{ formatDateTime(session.lastActivityAt) }}
                              </span>
                              <span>
                                {{ $t('account.expiresAt') }}:
                                {{ formatDateTime(session.expiresAt) }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </v-list-item>
                    </v-list>
                    <div v-else class="sapling-account-dialog__sync-unavailable">
                      {{ $t('account.noActiveSessions') }}
                    </div>
                  </section>
                </v-window-item>

                <v-window-item value="preferences">
                  <section class="sapling-account-dialog__panel-stack">
                    <div class="sapling-account-dialog__section-heading">
                      <v-icon color="primary">mdi-translate</v-icon>
                      <span>{{ $t('navigation.language') }}</span>
                    </div>
                    <v-btn-toggle
                      divided
                      mandatory
                      :model-value="currentLanguage"
                      variant="outlined"
                      class="sapling-account-dialog__language-toggle"
                    >
                      <v-btn
                        v-for="language in languageOptions"
                        :key="language.key"
                        :value="language.key"
                        @click="setLanguage(language.key)"
                      >
                        {{ language.label }}
                      </v-btn>
                    </v-btn-toggle>

                    <v-divider />

                    <div class="sapling-account-dialog__preference-grid">
                      <button
                        v-for="action in appearanceActions"
                        :key="action.key"
                        type="button"
                        class="sapling-account-dialog__preference-action"
                        :class="{
                          'sapling-account-dialog__preference-action--active': action.isActive,
                        }"
                        @click="action.handler()"
                      >
                        <span class="sapling-account-dialog__preference-icon">
                          <v-icon :icon="action.icon" />
                        </span>
                        <span class="sapling-account-dialog__preference-label">
                          {{ action.label }}
                        </span>
                        <v-icon
                          :icon="action.isActive ? 'mdi-check-circle' : 'mdi-chevron-right'"
                          size="18"
                        />
                      </button>
                    </div>
                  </section>
                </v-window-item>

                <v-window-item value="songbird">
                  <section class="sapling-account-dialog__panel-stack">
                    <div class="sapling-account-dialog__section-heading">
                      <v-icon color="primary">mdi-creation-outline</v-icon>
                      <span>{{ $t('account.songbird') }}</span>
                    </div>
                    <div class="sapling-account-dialog__ai-grid">
                      <SaplingStaticSelect
                        :model-value="aiPreferences.chatProviderHandle"
                        :loading="isAiPreferencesLoading"
                        :items="aiProviderOptions"
                        :label="$t('aiChat.provider')"
                        @update:model-value="updateAiProvider"
                      />
                      <SaplingStaticSelect
                        :model-value="aiPreferences.chatModelHandle"
                        :loading="isAiPreferencesLoading"
                        :items="aiModelOptions"
                        :label="$t('aiChat.model')"
                        @update:model-value="updateAiModel"
                      />
                      <SaplingStaticSelect
                        :model-value="aiPreferences.transcriptionProviderHandle"
                        :loading="isAiPreferencesLoading"
                        :items="transcriptionProviderOptions"
                        :label="$t('aiChat.voiceProvider')"
                        @update:model-value="updateTranscriptionProvider"
                      />
                      <SaplingStaticSelect
                        :model-value="aiPreferences.transcriptionModelHandle"
                        :loading="isAiPreferencesLoading"
                        :items="transcriptionModelOptions"
                        :label="$t('aiChat.voiceModel')"
                        @update:model-value="updateTranscriptionModel"
                      />
                      <SaplingStaticSelect
                        :model-value="aiPreferences.speechProviderHandle"
                        :loading="isAiPreferencesLoading"
                        :items="speechProviderOptions"
                        :label="$t('aiChat.voiceOutputProvider')"
                        @update:model-value="updateSpeechProvider"
                      />
                      <SaplingStaticSelect
                        :model-value="aiPreferences.speechModelHandle"
                        :loading="isAiPreferencesLoading"
                        :items="speechModelOptions"
                        :label="$t('aiChat.voiceOutputModel')"
                        @update:model-value="updateSpeechModel"
                      />
                    </div>
                    <v-btn
                      color="primary"
                      variant="flat"
                      prepend-icon="mdi-content-save-outline"
                      :loading="isAiPreferencesSaving"
                      @click="saveAiPreferenceSelection"
                    >
                      {{ $t('account.saveSongbird') }}
                    </v-btn>
                  </section>
                </v-window-item>
              </v-window>
            </div>
          </div>
        </template>

        <template #actions>
          <SaplingActionBarSkeleton
            v-if="isLoading || !currentPersonStore.loaded"
            :leading="1"
            :trailing="2"
          />

          <SaplingActionAccount
            v-else
            :handleClose="handleClose"
            :handleChangePassword="changePassword"
            :handleLogout="logout"
          />
        </template>
      </SaplingDialogShell>
    </SaplingDialogCard>
    <!-- Password change dialog -->
    <SaplingChangePassword v-model="showPasswordChange" />
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSaplingAccount, type AccountTab } from '@/composables/account/useSaplingAccount'
import { openContextHelpArticle } from '@/composables/knowledge/useSaplingContextHelp'
import SaplingChangePassword from '@/components/account/SaplingChangePassword.vue'
import SaplingPasskeyManager from '@/components/account/SaplingPasskeyManager.vue'
import SaplingActionAccount from '@/components/actions/SaplingActionAccount.vue'
import SaplingActionBarSkeleton from '@/components/actions/SaplingActionBarSkeleton.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import SaplingStaticSelect from '@/components/common/SaplingStaticSelect.vue'
// #endregion

// #region Composable
const router = useRouter()
const emit = defineEmits<{
  (event: 'close'): void
}>()

const props = withDefaults(
  defineProps<{
    initialTab?: AccountTab
  }>(),
  {
    initialTab: 'profile',
  },
)

const {
  isLoading,
  showPasswordChange,
  currentPersonStore,
  workHours,
  profileForm,
  isProfileSaving,
  calendarSync,
  notificationPreferences,
  isNotificationPreferencesSaving,
  currentSessions,
  isSessionsLoading,
  isSessionsTerminating,
  activeAccountTab,
  accountTabs,
  calendarSyncRangeOptions,
  calendarSyncIntervalOptions,
  calendarSyncDetails,
  isCalendarSyncSaving,
  currentLanguage,
  languageOptions,
  appearanceActions,
  aiPreferences,
  aiProviderOptions,
  aiModelOptions,
  transcriptionProviderOptions,
  transcriptionModelOptions,
  speechProviderOptions,
  speechModelOptions,
  isAiPreferencesLoading,
  isAiPreferencesSaving,
  dialog,
  currentWeekday,
  accountDetails,
  workHourRows,
  changePassword,
  saveProfile,
  saveCalendarSync,
  saveNotificationPreferenceSelection,
  loadCurrentSessions,
  terminateOtherSessions,
  formatDateTime,
  setLanguage,
  updateAiProvider,
  updateAiModel,
  updateTranscriptionProvider,
  updateTranscriptionModel,
  updateSpeechProvider,
  updateSpeechModel,
  saveAiPreferenceSelection,
  logout,
} = useSaplingAccount()

watch(
  () => props.initialTab,
  (tab) => {
    activeAccountTab.value = tab
  },
  { immediate: true },
)

const accountTitle = computed(() => {
  const person = currentPersonStore.person

  if (!person) {
    return ''
  }

  return `${person.firstName} ${person.lastName}`.trim()
})

const accountSubtitle = computed(
  () => currentPersonStore.person?.email || currentPersonStore.person?.mobile || '',
)

const isSaplingAccount = computed(() => {
  const personType = currentPersonStore.person?.type

  return typeof personType === 'string'
    ? personType === 'sapling'
    : personType?.handle === 'sapling'
})

function handleClose() {
  emit('close')
}

async function openProfileContextHelp() {
  if (await openContextHelpArticle(router, 'app.profile')) {
    handleClose()
  }
}
// #endregion
</script>
