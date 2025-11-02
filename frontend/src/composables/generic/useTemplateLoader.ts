import { ref, onMounted } from 'vue';
import ApiService from '@/services/api.service';
import type { EntityTemplate } from '@/entity/structure';

export function useTemplateLoader(type: string, autoLoad = true) {
  const templates = ref<EntityTemplate[]>([]);
  const isLoading = ref(false);

  async function loadTemplates() {
    isLoading.value = true;
    templates.value = await ApiService.findAll<EntityTemplate[]>(`template/${type}`);
    isLoading.value = false;
  }

  if (autoLoad) {
    onMounted(loadTemplates);
  }

  return { templates, isLoading, loadTemplates };
}
