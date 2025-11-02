import { ref, onMounted } from 'vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import axios from 'axios';
import { BACKEND_URL } from '@/constants/project.constants';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import ApiService from '@/services/api.service';
import type { WorkHourWeekItem } from '@/entity/entity';

export function useSaplingAccount() {
  // State
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('global', 'person', 'login', 'workHour' ,'workHourWeek');
  const showPasswordChange = ref(false);
  const currentPersonStore = useCurrentPersonStore();
  const workHours = ref<WorkHourWeekItem | null>(null);

  // Lifecycle
  onMounted(() => {
    loadTranslations();
    currentPersonStore.fetchCurrentPerson();
    loadWorkHours();
  });

  // Password
  function changePassword() {
    showPasswordChange.value = true;
  }

  // Age
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

  // Logout
  async function logout() {
    await axios.get(BACKEND_URL + 'auth/logout');
    window.location.href = '/login';
  }

  async function loadWorkHours() {
    workHours.value = await ApiService.findOne<WorkHourWeekItem>('current/workWeek');
  }
  
  return {
    translationService,
    isLoading,
    showPasswordChange,
    currentPersonStore,
    workHours,
    loadTranslations,
    changePassword,
    calculateAge,
    logout,
  };
}
