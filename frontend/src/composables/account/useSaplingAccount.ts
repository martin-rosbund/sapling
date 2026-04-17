import { computed, onMounted, ref } from 'vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import axios from 'axios'
import { BACKEND_URL } from '@/constants/project.constants'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import ApiService from '@/services/api.service'
import type { WorkHourWeekItem } from '@/entity/entity'

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
  )

  const showPasswordChange = ref(false)
  const currentPersonStore = useCurrentPersonStore()
  const workHours = ref<WorkHourWeekItem | null>(null)
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
        value: age ?? '-',
        suffixKey: age != null ? 'global.years' : undefined,
      },
    ]
  })

  const workHourRows = computed<WorkHourRow[]>(() =>
    WORK_HOUR_DAY_KEYS.map((dayKey) => ({
      key: dayKey,
      timeFrom: workHours.value?.[dayKey]?.timeFrom || '-',
      timeTo: workHours.value?.[dayKey]?.timeTo || '-',
    })),
  )
  //#endregion

  //#region Lifecycle
  /**
   * Loads the current account payload as soon as the dialog is mounted.
   */
  onMounted(async () => {
    await Promise.all([currentPersonStore.fetchCurrentPerson(), loadWorkHours()])
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
    return value || '-'
  }

  /**
   * Formats the birthday for the account detail list.
   */
  function formatBirthDay(birthDay?: Date | string | null): string {
    if (!birthDay) {
      return '-'
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
    await axios.get(BACKEND_URL + 'auth/logout') // Call the backend logout endpoint.
    window.location.href = '/login'
  }

  /**
   * Loads the work hours of the current user from the backend.
   */
  async function loadWorkHours() {
    workHours.value = await ApiService.findOne<WorkHourWeekItem>('current/workWeek')
  }

  /**
   * Maps the native JavaScript weekday to the Monday-first representation used in the UI.
   */
  function getCurrentWeekday(): number {
    const jsDay = new Date().getDay()
    return jsDay === 0 ? 6 : jsDay - 1
  }
  //#endregion

  //#region Return
  return {
    isLoading,
    showPasswordChange,
    currentPersonStore,
    workHours,
    dialog,
    currentWeekday,
    accountDetails,
    workHourRows,
    changePassword,
    calculateAge,
    logout,
  }
  //#endregion
}
