import { ref, onMounted } from 'vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import axios from 'axios';
import { BACKEND_URL } from '@/constants/project.constants';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import ApiService from '@/services/api.service';
import type { WorkHourWeekItem } from '@/entity/entity';

/**
 * Composable function to manage the Sapling Account functionality.
 * Provides state, lifecycle hooks, and methods for managing user account details.
 */
export function useSaplingAccount() {
  //#region State
  /**
   * Reactive reference to control the visibility of a dialog.
   */
  const dialog = ref(true);
  /**
   * Translation service for loading and managing translations.
   */
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('global', 'person', 'login', 'workHour', 'workHourWeek');

  /**
   * Reactive reference to control the visibility of the password change dialog.
   */
  const showPasswordChange = ref(false);

  /**
   * Store for managing the current person's data.
   */
  const currentPersonStore = useCurrentPersonStore();

  /**
   * Reactive reference to store the work hours of the current user.
   */
  const workHours = ref<WorkHourWeekItem | null>(null);

    /**
     * Berechnet den aktuellen Wochentag (Montag=0, ..., Sonntag=6)
     */
    const currentWeekday = (() => {
      const jsDay = new Date().getDay();
      return jsDay === 0 ? 6 : jsDay - 1;
    })();
  //#endregion

  //#region Lifecycle
  /**
   * Lifecycle hook to load translations, fetch the current person's data, and load work hours on component mount.
   */
  onMounted(() => {
    loadTranslations();
    currentPersonStore.fetchCurrentPerson();
    loadWorkHours();
  });
  //#endregion

  //#region Methods
  /**
   * Opens the password change dialog.
   */
  function changePassword() {
    showPasswordChange.value = true;
  }

  /**
   * Calculates the age of the user based on their birth date.
   * @param birthDay - The birth date of the user as a Date, string, or null.
   * @returns The calculated age or null if the birth date is invalid.
   */
  function calculateAge(birthDay: Date | string | null): number | null {
    if (!birthDay) return null;
    const birth = new Date(birthDay);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Logs the user out by calling the backend logout endpoint and redirecting to the login page.
   */
  async function logout() {
    await axios.get(BACKEND_URL + 'auth/logout'); // Call the backend logout endpoint.
    window.location.href = '/login';
  }

  /**
   * Loads the work hours of the current user from the backend.
   */
  async function loadWorkHours() {
    workHours.value = await ApiService.findOne<WorkHourWeekItem>('current/workWeek');
  }
  //#endregion

  //#region Return
  // Return the state and methods to be used in the consuming component.
  return {
    translationService,
    isLoading,
    showPasswordChange,
    currentPersonStore,
    workHours,
    dialog,
    currentWeekday,
    loadTranslations,
    changePassword,
    calculateAge,
    logout
  };
  //#endregion
}
