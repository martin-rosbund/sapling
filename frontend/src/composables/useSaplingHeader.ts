import { ref, onMounted, onUnmounted } from 'vue';
import ApiService from '@/services/api.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';

export function useSaplingHeader() {
  const searchQuery = ref('');
  const drawer = ref(false);
  const showInbox = ref(false);
  const countTasks = ref(0);
  const time = ref(new Date().toLocaleTimeString());
  const currentPersonStore = useCurrentPersonStore();
  let timerClock: number;
  let timerTasks: number;

  function onSearch() {
    if (searchQuery.value.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.value)}`;
    }
  }

  async function countOpenTasks() {
    countTasks.value = (await ApiService.findAll<{ count: number }>('current/countOpenTasks')).count;
  }

  onMounted(() => {
    currentPersonStore.fetchCurrentPerson();
    countOpenTasks();
    timerClock = window.setInterval(() => {
      time.value = new Date().toLocaleTimeString();
    }, 1000);
    timerTasks = window.setInterval(() => {
      countOpenTasks();
    }, 10000);
  });

  onUnmounted(() => {
    clearInterval(timerClock);
    clearInterval(timerTasks);
  });

  return {
    searchQuery,
    drawer,
    showInbox,
    countTasks,
    time,
    currentPersonStore,
    onSearch,
    countOpenTasks,
  };
}
