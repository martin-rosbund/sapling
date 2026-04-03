import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import ApiService from '@/services/api.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';

/**
 * Provides the state and interaction handlers for the shared application header.
 */
export function useSaplingHeader() {
  //#region State
  const router = useRouter();
  const drawer = ref(false);
  const showInbox = ref(false);
  const showAccount = ref(false);
  const countTasks = ref(0);
  const time = ref(new Date().toLocaleTimeString());
  const currentPersonStore = useCurrentPersonStore();
  let timerClock: number | undefined;
  let timerTasks: number | undefined;
  //#endregion

  //#region Lifecycle Hooks
  /**
   * Initializes the header state and starts the refresh timers.
   */
  onMounted(async () => {
    await Promise.all([
      currentPersonStore.fetchCurrentPerson(),
      countOpenTasks(),
    ]);

    timerClock = window.setInterval(updateClock, 1000);
    timerTasks = window.setInterval(() => {
      countOpenTasks();
    }, 60000);
  });

  /**
   * Disposes the running header timers.
   */
  onUnmounted(() => {
    if (timerClock != null) {
      clearInterval(timerClock);
    }

    if (timerTasks != null) {
      clearInterval(timerTasks);
    }
  });
  //#endregion

  //#region Methods
  /**
   * Updates the live clock shown in the header.
   */
  function updateClock() {
    time.value = new Date().toLocaleTimeString();
  }

  /**
   * Fetches the current number of open tasks.
   */
  async function countOpenTasks() {
    countTasks.value = (await ApiService.findAll<{ count: number }>('current/countOpenTasks')).count;
  }

  /**
   * Toggles the navigation drawer state.
   */
  function toggleDrawer() {
    drawer.value = !drawer.value;
  }

  /**
   * Opens the inbox dialog.
   */
  function openInbox() {
    showInbox.value = true;
  }

  /**
   * Closes the inbox dialog.
   */
  function closeInbox() {
    showInbox.value = false;
  }

  /**
   * Opens the account dialog.
   */
  function openAccount() {
    showAccount.value = true;
  }

  /**
   * Closes the account dialog.
   */
  function closeAccount() {
    showAccount.value = false;
  }

  /**
   * Navigates back to the home route.
   */
  async function goHome() {
    await router.push('/');
  }
  //#endregion

  //#region Return
  return {
    drawer,
    showInbox,
    showAccount,
    countTasks,
    time,
    currentPersonStore,
    toggleDrawer,
    openInbox,
    closeInbox,
    openAccount,
    closeAccount,
    goHome,
    countOpenTasks,
  };
  //#endregion
}
