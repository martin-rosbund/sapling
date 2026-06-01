import { computed, onMounted, ref } from 'vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import axios from 'axios'
import { BACKEND_URL } from '@/constants/project.constants'
import { i18n } from '@/i18n'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import ApiService from '@/services/api.service'
import type { AiProviderModelItem, AiProviderTypeItem, WorkHourWeekItem } from '@/entity/entity'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useSaplingPreferences } from '@/composables/system/useSaplingPreferences'
import ApiAiService from '@/services/api.ai.service'
import {
  getDefaultModelForProvider,
  getModelProviderHandle,
  resolveRuntimeTarget,
} from '@/components/system/ai-chat/aiChatRuntimeTargets'
import {
  loadSaplingAiPreferences,
  saveSaplingAiPreferences,
  type SaplingAiPreferences,
} from '@/services/ai-preferences.service'

interface AccountDetailItem {
  key: string
  icon: string
  value: number | string
  suffixKey?: string
}

type WorkHourDayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

interface WorkHourRow {
  key: WorkHourDayKey
  timeFrom: string
  timeTo: string
}

type CalendarSyncRange = 'day' | 'week' | 'month'

interface CalendarSyncSubscription {
  handle?: number
  isAvailable: boolean
  isActive: boolean
  syncRange: CalendarSyncRange
  intervalMinutes: number
  lastRunAt?: string | Date | null
  lastSuccessAt?: string | Date | null
  lastError?: string | null
  lastImportedCount: number
  lastCreatedCount: number
  lastUpdatedCount: number
  lastSkippedCount: number
}

interface CalendarSyncOption<T> {
  title: string
  value: T
}

export type AccountTab = 'profile' | 'sync' | 'security' | 'preferences' | 'songbird'

interface AccountTabItem {
  key: AccountTab
  icon: string
  label: string
}

interface AccountSelectOption<T> {
  title: string
  value: T
}

const WORK_HOUR_DAY_KEYS: WorkHourDayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

/**
 * Composable function to manage the Sapling Account functionality.
 * Provides state, lifecycle hooks, and methods for managing user account details.
 */
export function useSaplingAccount() {
  //#region State
  const dialog = ref(true)
  const { isLoading } = useTranslationLoader(
    'global',
    'person',
    'login',
    'workHour',
    'workHourWeek',
    'calendarSyncSubscription',
    'account',
    'navigation',
    'aiChat',
    'ai',
  )

  const showPasswordChange = ref(false)
  const { pushMessage } = useSaplingMessageCenter()
  const {
    currentLanguage,
    languageOptions,
    appearanceActions,
    setLanguage,
  } = useSaplingPreferences()
  const currentPersonStore = useCurrentPersonStore()
  const workHours = ref<WorkHourWeekItem | null>(null)
  const calendarSync = ref<CalendarSyncSubscription | null>(null)
  const isCalendarSyncSaving = ref(false)
  const activeAccountTab = ref<AccountTab>('profile')
  const isAiPreferencesLoading = ref(false)
  const isAiPreferencesSaving = ref(false)
  const aiProviderConfigs = ref<AiProviderTypeItem[]>([])
  const aiModelConfigs = ref<AiProviderModelItem[]>([])
  const transcriptionProviderConfigs = ref<AiProviderTypeItem[]>([])
  const transcriptionModelConfigs = ref<AiProviderModelItem[]>([])
  const speechProviderConfigs = ref<AiProviderTypeItem[]>([])
  const speechModelConfigs = ref<AiProviderModelItem[]>([])
  const aiPreferences = ref<SaplingAiPreferences>(loadSaplingAiPreferences())
  const currentWeekday = getCurrentWeekday()

  const accountDetails = computed<AccountDetailItem[]>(() => {
    const person = currentPersonStore.person
    const age = person?.birthDay ? calculateAge(person.birthDay) : null

    return [
      {
        key: 'email',
        icon: 'mdi-mail',
        value: formatAccountValue(person?.email),
      },
      {
        key: 'mobile',
        icon: 'mdi-cellphone',
        value: formatAccountValue(person?.mobile),
      },
      {
        key: 'phone',
        icon: 'mdi-phone',
        value: formatAccountValue(person?.phone),
      },
      {
        key: 'birthday',
        icon: 'mdi-cake-variant',
        value: formatBirthDay(person?.birthDay),
      },
      {
        key: 'age',
        icon: 'mdi-account-clock',
        value: age ?? i18n.global.t('global.notAvailable'),
        suffixKey: age != null ? 'global.years' : undefined,
      },
    ]
  })

  const workHourRows = computed<WorkHourRow[]>(() =>
    WORK_HOUR_DAY_KEYS.map((dayKey) => ({
      key: dayKey,
      timeFrom: workHours.value?.[dayKey]?.timeFrom || i18n.global.t('global.notAvailable'),
      timeTo: workHours.value?.[dayKey]?.timeTo || i18n.global.t('global.notAvailable'),
    })),
  )

  const calendarSyncRangeOptions = computed<CalendarSyncOption<CalendarSyncRange>[]>(() => [
    { title: i18n.global.t('calendarSyncSubscription.rangeDay'), value: 'day' },
    { title: i18n.global.t('calendarSyncSubscription.rangeWeek'), value: 'week' },
    { title: i18n.global.t('calendarSyncSubscription.rangeMonth'), value: 'month' },
  ])

  const calendarSyncIntervalOptions = computed<CalendarSyncOption<number>[]>(() => [
    { title: i18n.global.t('calendarSyncSubscription.interval15'), value: 15 },
    { title: i18n.global.t('calendarSyncSubscription.interval30'), value: 30 },
    { title: i18n.global.t('calendarSyncSubscription.interval60'), value: 60 },
    { title: i18n.global.t('calendarSyncSubscription.interval240'), value: 240 },
  ])

  const calendarSyncDetails = computed<AccountDetailItem[]>(() => {
    const subscription = calendarSync.value

    return [
      {
        key: 'lastRunAt',
        icon: 'mdi-calendar-clock-outline',
        value: formatDateTime(subscription?.lastRunAt),
      },
      {
        key: 'lastSuccessAt',
        icon: 'mdi-calendar-check-outline',
        value: formatDateTime(subscription?.lastSuccessAt),
      },
      {
        key: 'lastImportedCount',
        icon: 'mdi-calendar-import-outline',
        value: formatCalendarSyncResult(subscription),
      },
      {
        key: 'lastError',
        icon: 'mdi-alert-circle-outline',
        value: subscription?.lastError || i18n.global.t('global.notAvailable'),
      },
    ]
  })

  const accountTabs = computed<AccountTabItem[]>(() => [
    { key: 'profile', icon: 'mdi-account-outline', label: i18n.global.t('account.profile') },
    { key: 'sync', icon: 'mdi-sync', label: i18n.global.t('account.synchronizations') },
    { key: 'security', icon: 'mdi-shield-key-outline', label: i18n.global.t('account.security') },
    { key: 'preferences', icon: 'mdi-palette-outline', label: i18n.global.t('account.preferences') },
    { key: 'songbird', icon: 'mdi-creation-outline', label: i18n.global.t('account.songbird') },
  ])

  const aiProviderOptions = computed(() => mapProviderOptions(aiProviderConfigs.value))
  const aiModelOptions = computed(() =>
    mapModelOptions(
      aiModelConfigs.value.filter(
        (item) => getModelProviderHandle(item) === aiPreferences.value.chatProviderHandle,
      ),
    ),
  )
  const transcriptionProviderOptions = computed(() =>
    mapProviderOptions(transcriptionProviderConfigs.value),
  )
  const transcriptionModelOptions = computed(() =>
    mapModelOptions(
      transcriptionModelConfigs.value.filter(
        (item) =>
          getModelProviderHandle(item) === aiPreferences.value.transcriptionProviderHandle,
      ),
    ),
  )
  const speechProviderOptions = computed(() => mapProviderOptions(speechProviderConfigs.value))
  const speechModelOptions = computed(() =>
    mapModelOptions(
      speechModelConfigs.value.filter(
        (item) => getModelProviderHandle(item) === aiPreferences.value.speechProviderHandle,
      ),
    ),
  )
  //#endregion

  //#region Lifecycle
  /**
   * Loads the current account payload as soon as the dialog is mounted.
   */
  onMounted(async () => {
    await Promise.all([
      currentPersonStore.fetchCurrentPerson(),
      loadWorkHours(),
      loadCalendarSync(),
      loadAiPreferences(),
    ])
  })
  //#endregion

  //#region Methods
  /**
   * Opens the password change dialog.
   */
  function changePassword() {
    showPasswordChange.value = true
  }

  /**
   * Formats a nullable account value for direct UI rendering.
   */
  function formatAccountValue(value?: string | null): string {
    return value || i18n.global.t('global.notAvailable')
  }

  /**
   * Formats the birthday for the account detail list.
   */
  function formatBirthDay(birthDay?: Date | string | null): string {
    if (!birthDay) {
      return i18n.global.t('global.notAvailable')
    }

    return new Date(birthDay).toLocaleDateString()
  }

  /**
   * Calculates the age of the user based on their birth date.
   * @param birthDay - The birth date of the user as a Date, string, or null.
   * @returns The calculated age or null if the birth date is invalid.
   */
  function calculateAge(birthDay: Date | string | null): number | null {
    if (!birthDay) return null
    const birth = new Date(birthDay)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  /**
   * Logs the user out by calling the backend logout endpoint and redirecting to the login page.
   */
  async function logout() {
    await axios.post(BACKEND_URL + 'auth/logout') // Call the backend logout endpoint.
    window.location.href = '/login'
  }

  /**
   * Loads the work hours of the current user from the backend.
   */
  async function loadWorkHours() {
    workHours.value = await ApiService.findOne<WorkHourWeekItem>('current/workWeek')
  }

  /**
   * Loads the current user's automatic Outlook import settings.
   */
  async function loadCalendarSync() {
    calendarSync.value =
      await ApiService.findOne<CalendarSyncSubscription>('current/calendarSync')
  }

  /**
   * Persists the current user's automatic Outlook import settings.
   */
  async function saveCalendarSync() {
    if (!calendarSync.value) {
      return
    }

    isCalendarSyncSaving.value = true

    try {
      calendarSync.value = await ApiService.patch<CalendarSyncSubscription>('current/calendarSync', {
        isActive: calendarSync.value.isActive,
        syncRange: calendarSync.value.syncRange,
        intervalMinutes: calendarSync.value.intervalMinutes,
      })
      pushMessage('success', 'calendarSyncSubscription.saveSuccess', '', 'calendarSyncSubscription')
    } finally {
      isCalendarSyncSaving.value = false
    }
  }

  async function loadAiPreferences() {
    isAiPreferencesLoading.value = true

    try {
      const [
        providers,
        models,
        transcriptionProviders,
        transcriptionModels,
        speechProviders,
        speechModels,
      ] = await Promise.all([
        ApiAiService.listProviders(),
        ApiAiService.listModels(),
        ApiAiService.listTranscriptionProviders(),
        ApiAiService.listTranscriptionModels(),
        ApiAiService.listSpeechProviders(),
        ApiAiService.listSpeechModels(),
      ])

      aiProviderConfigs.value = providers
      aiModelConfigs.value = models
      transcriptionProviderConfigs.value = transcriptionProviders
      transcriptionModelConfigs.value = transcriptionModels
      speechProviderConfigs.value = speechProviders
      speechModelConfigs.value = speechModels
      syncAiPreferenceTargets()
    } finally {
      isAiPreferencesLoading.value = false
    }
  }

  function updateAiProvider(value: unknown) {
    const providerHandle = normalizeHandle(value)

    aiPreferences.value.chatProviderHandle = providerHandle
    aiPreferences.value.chatModelHandle =
      getDefaultModelForProvider(
        aiModelConfigs.value,
        providerHandle,
        aiPreferences.value.chatModelHandle,
      )?.handle ?? null
  }

  function updateAiModel(value: unknown) {
    const model = aiModelConfigs.value.find((item) => item.handle === normalizeHandle(value)) ?? null

    aiPreferences.value.chatProviderHandle = getModelProviderHandle(model)
    aiPreferences.value.chatModelHandle = model?.handle ?? null
  }

  function updateTranscriptionProvider(value: unknown) {
    const providerHandle = normalizeHandle(value)

    aiPreferences.value.transcriptionProviderHandle = providerHandle
    aiPreferences.value.transcriptionModelHandle =
      getDefaultModelForProvider(
        transcriptionModelConfigs.value,
        providerHandle,
        aiPreferences.value.transcriptionModelHandle,
      )?.handle ?? null
  }

  function updateTranscriptionModel(value: unknown) {
    const model =
      transcriptionModelConfigs.value.find((item) => item.handle === normalizeHandle(value)) ?? null

    aiPreferences.value.transcriptionProviderHandle = getModelProviderHandle(model)
    aiPreferences.value.transcriptionModelHandle = model?.handle ?? null
  }

  function updateSpeechProvider(value: unknown) {
    const providerHandle = normalizeHandle(value)

    aiPreferences.value.speechProviderHandle = providerHandle
    aiPreferences.value.speechModelHandle =
      getDefaultModelForProvider(
        speechModelConfigs.value,
        providerHandle,
        aiPreferences.value.speechModelHandle,
      )?.handle ?? null
  }

  function updateSpeechModel(value: unknown) {
    const model =
      speechModelConfigs.value.find((item) => item.handle === normalizeHandle(value)) ?? null

    aiPreferences.value.speechProviderHandle = getModelProviderHandle(model)
    aiPreferences.value.speechModelHandle = model?.handle ?? null
  }

  function saveAiPreferenceSelection() {
    isAiPreferencesSaving.value = true

    try {
      saveSaplingAiPreferences(aiPreferences.value)
      pushMessage('success', 'account.aiPreferencesSaved', '', 'account')
    } finally {
      isAiPreferencesSaving.value = false
    }
  }

  /**
   * Maps the native JavaScript weekday to the Monday-first representation used in the UI.
   */
  function getCurrentWeekday(): number {
    const jsDay = new Date().getDay()
    return jsDay === 0 ? 6 : jsDay - 1
  }

  function formatDateTime(value?: string | Date | null): string {
    if (!value) {
      return i18n.global.t('global.notAvailable')
    }

    return new Date(value).toLocaleString()
  }

  function formatCalendarSyncResult(subscription?: CalendarSyncSubscription | null): string {
    if (!subscription?.lastSuccessAt) {
      return i18n.global.t('global.notAvailable')
    }

    return `${subscription.lastImportedCount} / ${subscription.lastCreatedCount} / ${subscription.lastUpdatedCount} / ${subscription.lastSkippedCount}`
  }

  function syncAiPreferenceTargets() {
    const chatTarget = resolveRuntimeTarget({
      providerConfigs: aiProviderConfigs.value,
      modelConfigs: aiModelConfigs.value,
      requestedProviderHandle: aiPreferences.value.chatProviderHandle,
      requestedModelHandle: aiPreferences.value.chatModelHandle,
      preferredModelHandle: aiPreferences.value.chatModelHandle,
    })
    const transcriptionTarget = resolveRuntimeTarget({
      providerConfigs: transcriptionProviderConfigs.value,
      modelConfigs: transcriptionModelConfigs.value,
      requestedProviderHandle: aiPreferences.value.transcriptionProviderHandle,
      requestedModelHandle: aiPreferences.value.transcriptionModelHandle,
      preferredModelHandle: aiPreferences.value.transcriptionModelHandle,
    })
    const speechTarget = resolveRuntimeTarget({
      providerConfigs: speechProviderConfigs.value,
      modelConfigs: speechModelConfigs.value,
      requestedProviderHandle: aiPreferences.value.speechProviderHandle,
      requestedModelHandle: aiPreferences.value.speechModelHandle,
      preferredModelHandle: aiPreferences.value.speechModelHandle,
    })

    aiPreferences.value = {
      chatProviderHandle: chatTarget.providerHandle,
      chatModelHandle: chatTarget.modelHandle,
      transcriptionProviderHandle: transcriptionTarget.providerHandle,
      transcriptionModelHandle: transcriptionTarget.modelHandle,
      speechProviderHandle: speechTarget.providerHandle,
      speechModelHandle: speechTarget.modelHandle,
    }
  }

  function mapProviderOptions(
    providers: AiProviderTypeItem[],
  ): AccountSelectOption<string>[] {
    return providers.map((provider) => ({
      title: provider.title || provider.handle || '',
      value: provider.handle || '',
    }))
  }

  function mapModelOptions(models: AiProviderModelItem[]): AccountSelectOption<string>[] {
    return models.map((model) => ({
      title: model.providerModel ? `${model.title} (${model.providerModel})` : model.title,
      value: model.handle || '',
    }))
  }

  function normalizeHandle(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    return null
  }
  //#endregion

  //#region Return
  return {
    isLoading,
    showPasswordChange,
    currentPersonStore,
    workHours,
    calendarSync,
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
    calculateAge,
    saveCalendarSync,
    setLanguage,
    updateAiProvider,
    updateAiModel,
    updateTranscriptionProvider,
    updateTranscriptionModel,
    updateSpeechProvider,
    updateSpeechModel,
    saveAiPreferenceSelection,
    logout,
  }
  //#endregion
}
