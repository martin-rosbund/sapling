import { defineStore } from 'pinia';
import { ref } from 'vue';
import ApiService from '@/services/api.service';
import type { PersonItem } from '../entity/entity';

export const useCurrentPersonStore = defineStore('currentPerson', () => {
  const person = ref<PersonItem | null>(null);
  const loading = ref(false);
  const loaded = ref(false);
  let fetchPromise: Promise<void> | null = null;

  async function fetchCurrentPerson(force = false): Promise<void> {
    if (loaded.value && person.value && !force) return;
    if (loading.value && fetchPromise) {
      await fetchPromise;
      return;
    }
    loading.value = true;
    fetchPromise = (async () => {
      try {
        person.value = await ApiService.findOne<PersonItem>('current/person');
        loaded.value = true;
      } catch {
        person.value = null;
        loaded.value = false;
      } finally {
        loading.value = false;
        fetchPromise = null;
      }
    })();
    await fetchPromise;
  }

  return {
    person,
    loading,
    loaded,
    fetchCurrentPerson,
  };
});
