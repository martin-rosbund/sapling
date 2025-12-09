import { ref, onMounted, onUnmounted } from 'vue';
import ApiService from '@/services/api.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';

export function useSaplingHeader() {
  //#region State
  // Reactive property for the search query input
  const searchQuery = ref('');
  // Reactive property for the navigation drawer state
  const drawer = ref(false);
  // Reactive property for showing the inbox modal
  const showInbox = ref(false);
  // Reactive property for the count of open tasks
  const countTasks = ref(0);
  // Reactive property for the current time, updated every second
  const time = ref(new Date().toLocaleTimeString());
  // Store for managing the current person's data
  const currentPersonStore = useCurrentPersonStore();
  // Timer for updating the clock
  let timerClock: number;
  // Timer for updating the task count
  let timerTasks: number;
  //#endregion

  //#region Methods
  // Function to fetch and update the count of open tasks
  async function countOpenTasks() {
    countTasks.value = (await ApiService.findAll<{ count: number }>('current/countOpenTasks')).count;
  }
  //#endregion

  //#region Lifecycle Hooks
  // Lifecycle hook: Called when the component is mounted
  onMounted(() => {
    // Fetch the current person's data
    currentPersonStore.fetchCurrentPerson();
    // Fetch the initial count of open tasks
    countOpenTasks();
    // Start a timer to update the clock every second
    timerClock = window.setInterval(() => {
      time.value = new Date().toLocaleTimeString();
    }, 1000);
    // Start a timer to update the task count every 10 seconds
    timerTasks = window.setInterval(() => {
      countOpenTasks();
    }, 60000);
  });

  // Lifecycle hook: Called when the component is unmounted
  onUnmounted(() => {
    // Clear the clock update timer
    clearInterval(timerClock);
    // Clear the task count update timer
    clearInterval(timerTasks);
  });
  //#endregion

  //#region Return
  // Return all reactive properties and methods for use in components
  return {
    searchQuery,
    drawer,
    showInbox,
    countTasks,
    time,
    currentPersonStore,
    countOpenTasks,
  };
  //#endregion
}
