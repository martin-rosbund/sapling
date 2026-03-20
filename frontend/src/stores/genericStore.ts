import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityState, EntityTemplate } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';

// Helper for cache key
function getGenericCacheKey(namespaces: string[], entityHandle: string, locale: string, key: string) {
  return [key, namespaces.sort().join(','), entityHandle, locale].join('|');
}

export const useGenericStore = defineStore('genericLoader', () => {
  // Map für alle EntityStates, key = dynamischer Identifier
  const entityStates = reactive(new Map<string, EntityState>());

  // Caches pro Key
  const genericTranslationLoadCache = new Map<string, Promise<unknown>>();
  const genericLoadCache = new Map<string, Promise<void>>();

  // Initialisiere State für einen Key
  function initState(entityHandle: string, namespaces: string[]) {
    if (!entityStates.has(entityHandle)) {
      entityStates.set(entityHandle, {
        isLoading: true,
        entity: null,
        entityPermission: null,
        entityTranslation: new TranslationService(),
        entityTemplates: [],
        currentEntityName: entityHandle,
        currentNamespaces: namespaces,
      });
    } else {
      // Update entityHandle/namespaces falls neu
      const state = entityStates.get(entityHandle)!;
      state.currentEntityName = entityHandle;
      state.currentNamespaces = namespaces;
    }
  }

  // Watch for language changes and reload translations for all entity states
  watch(() => i18n.global.locale.value, async () => {
    for (const [, state] of entityStates.entries()) {
      state.isLoading = true;
    }

    for (const [key] of entityStates.entries()) {
      await loadTranslations(key);
    }
  });

  // Haupt-Loader
  async function loadGeneric(entityHandle: string, ...namespaces: string[]) {
    initState(entityHandle, namespaces);
    const state = entityStates.get(entityHandle)!;

    // Check if a promise already exists for this entityHandle
    let promise = genericLoadCache.get(entityHandle);
    if (promise) {
      return promise; // Return the existing promise if state already exists
    }

    // If no promise exists, set isLoading to true and load data
    state.isLoading = true;
    promise = (async () => {
      try {
        await loadEntity(entityHandle);
        await loadTemplates(entityHandle);
        await loadPermissions(entityHandle);
        await loadTranslations(entityHandle);
      } finally {
        state.isLoading = false; // Ensure isLoading is reset even if an error occurs
      }
    })();

    genericLoadCache.set(entityHandle, promise);
    return promise;
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
    state.entityPermission = currentPermissionStore.accumulatedPermission?.find(x => x.entityHandle === state.currentEntityName) || null;
  }

  async function loadTemplates(key: string) {
    const state = entityStates.get(key)!;
    state.entityTemplates = await ApiService.findAll<EntityTemplate[]>(`template/${state.currentEntityName}`);
  }

  async function loadTranslations(key: string) {
    const state = entityStates.get(key)!;
    state.isLoading = true;
    const locale = i18n.global.locale.value;
    const cacheKey = getGenericCacheKey(state.currentNamespaces, state.currentEntityName, locale, key);
    let promise = genericTranslationLoadCache.get(cacheKey);
    if (!promise) {
      promise = state.entityTranslation.prepare(...state.currentNamespaces, state.currentEntityName);
      genericTranslationLoadCache.set(cacheKey, promise);
    }
    await promise;
    state.isLoading = false;
  }

  // Zugriff auf State für einen Key
  function getState(key: string): EntityState {
    if (!entityStates.has(key)) {
      // Default-Objekt zurückgeben, damit kein Fehler geworfen wird
      return {
        isLoading: true,
        entity: null,
        entityPermission: null,
        entityTranslation: new TranslationService(),
        entityTemplates: [],
        currentEntityName: key,
        currentNamespaces: [],
      };
    }
    return entityStates.get(key)!;
  }

  return {
    entityStates,
    loadGeneric,
    getState,
  };
});
