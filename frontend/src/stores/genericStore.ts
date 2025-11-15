
import { defineStore } from 'pinia';
import { ref, reactive, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';

// Helper for cache key
function getGenericCacheKey(namespaces: string[], entityName: string, templateRefs: string[], locale: string, key: string) {
  return [key, namespaces.sort().join(','), entityName, templateRefs.sort().join(','), locale].join('|');
}

// Entity state type
interface EntityState {
  entity: EntityItem | null;
  entityPermission: AccumulatedPermission | null;
  entityTranslation: TranslationService;
  entityTemplates: EntityTemplate[];
  isLoading: boolean;
  currentEntityName: string;
  currentNamespaces: string[];
}

export const useGenericStore = defineStore('genericLoader', () => {
  // Map für alle EntityStates, key = dynamischer Identifier
  const entityStates = reactive(new Map<string, EntityState>());

  // Caches pro Key
  const genericTranslationLoadCache = new Map<string, Promise<unknown>>();
  const genericLoadCache = new Map<string, Promise<void>>();

  // Initialisiere State für einen Key
  function initState(key: string, entityName: string, namespaces: string[]) {
    if (!entityStates.has(key)) {
      entityStates.set(key, {
        entity: null,
        entityPermission: null,
        entityTranslation: new TranslationService(),
        entityTemplates: [],
        isLoading: true,
        currentEntityName: entityName,
        currentNamespaces: namespaces,
      });
    } else {
      // Update entityName/namespaces falls neu
      const state = entityStates.get(key)!;
      state.currentEntityName = entityName;
      state.currentNamespaces = namespaces;
    }
  }

  // Watch for language changes and reload translations for all entity states
  watch(() => i18n.global.locale.value, async (newLocale, oldLocale) => {
    for (const [key, state] of entityStates.entries()) {
      state.isLoading = true;
      await loadTranslations(key);
      state.isLoading = false;
    }
  });

  // Haupt-Loader
  async function loadGeneric(key: string, entityName: string, ...namespaces: string[]) {
    initState(key, entityName, namespaces);
    const state = entityStates.get(key)!;
    state.isLoading = true;
    const locale = i18n.global.locale.value;
    // Template-Refs werden erst nach loadTemplates bestimmt, daher hier leer
    const cacheKey = [key, namespaces.sort().join(','), entityName, locale].join('|');
    let promise = genericLoadCache.get(cacheKey);
    if (!promise) {
      promise = (async () => {
        await loadEntity(key);
        await loadTemplates(key);
        await loadPermissions(key);
        await loadTranslations(key);
      })();
      genericLoadCache.set(cacheKey, promise);
      promise.finally(() => {
        genericLoadCache.delete(cacheKey);
      });
    }
    await promise;
    state.isLoading = false;
  }

  async function loadEntity(key: string) {
    const state = entityStates.get(key)!;
    const response = await ApiGenericService.find<EntityItem>('entity', { filter: { handle: state.currentEntityName }, limit: 1, page: 1 });
    state.entity = response.data[0] || null;
  }

  async function loadPermissions(key: string) {
    const state = entityStates.get(key)!;
    const currentPermissionStore = useCurrentPermissionStore();
    await currentPermissionStore.fetchCurrentPermission();
    state.entityPermission = currentPermissionStore.accumulatedPermission?.find(x => x.entityName === state.currentEntityName) || null;
  }

  async function loadTemplates(key: string) {
    const state = entityStates.get(key)!;
    state.entityTemplates = await ApiService.findAll<EntityTemplate[]>(`template/${state.currentEntityName}`);
  }

  async function loadTranslations(key: string) {
    const state = entityStates.get(key)!;
    state.isLoading = true;
    const locale = i18n.global.locale.value;
    const templateRefs = getUniqueTemplateReferenceNames(key);
    const cacheKey = getGenericCacheKey(state.currentNamespaces, state.currentEntityName, templateRefs, locale, key);
    let promise = genericTranslationLoadCache.get(cacheKey);
    if (!promise) {
      promise = state.entityTranslation.prepare(...state.currentNamespaces, state.currentEntityName, ...templateRefs);
      genericTranslationLoadCache.set(cacheKey, promise);
    }
    await promise;
    state.isLoading = false;
  }

  function getUniqueTemplateReferenceNames(key: string): string[] {
    const state = entityStates.get(key)!;
    return Array.from(new Set(state.entityTemplates.map(x => x.referenceName)));
  }

  // Zugriff auf State für einen Key
  function getState(key: string): EntityState {
    if (!entityStates.has(key)) throw new Error('GenericStore: State not initialized for key: ' + key);
    return entityStates.get(key)!;
  }

  return {
    entityStates,
    loadGeneric,
    getState,
  };
});
