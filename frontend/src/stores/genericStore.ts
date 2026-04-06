import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityState, EntityTemplate } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';

type GenericLoadRequest = {
  entityHandle: string;
  namespaces: string[];
};

function getTranslationBatchCacheKey(entityHandles: string[], locale: string) {
  return ['translation', [...new Set(entityHandles)].sort().join(','), locale].join('|');
}

export const useGenericStore = defineStore('genericLoader', () => {
  // Map für alle EntityStates, key = dynamischer Identifier
  const entityStates = reactive(new Map<string, EntityState>());

  // Caches pro Key
  const genericTranslationLoadCache = new Map<string, Promise<void>>();
  const genericLoadCache = new Map<string, Promise<void>>();
  const loadingCounter = reactive(new Map<string, number>());
  const queuedTranslationKeys = new Set<string>();
  let queuedTranslationPromise: Promise<void> | null = null;

  function normalizeEntityHandle(entityHandle: string) {
    return entityHandle.trim();
  }

  function beginLoading(...keys: string[]) {
    for (const key of new Set(keys.map(normalizeEntityHandle).filter(Boolean))) {
      const count = loadingCounter.get(key) ?? 0;
      loadingCounter.set(key, count + 1);
      const state = entityStates.get(key);
      if (state) {
        state.isLoading = true;
      }
    }
  }

  function endLoading(...keys: string[]) {
    for (const key of new Set(keys.map(normalizeEntityHandle).filter(Boolean))) {
      const count = loadingCounter.get(key) ?? 0;
      const nextCount = Math.max(0, count - 1);
      if (nextCount === 0) {
        loadingCounter.delete(key);
      } else {
        loadingCounter.set(key, nextCount);
      }

      const state = entityStates.get(key);
      if (state) {
        state.isLoading = nextCount > 0;
      }
    }
  }

  function getTranslationHandles(keys: string[]) {
    const handles = new Set<string>();

    for (const key of new Set(keys.map(normalizeEntityHandle).filter(Boolean))) {
      const state = entityStates.get(key);
      if (!state) {
        continue;
      }

      for (const namespace of state.currentNamespaces) {
        const normalizedNamespace = namespace.trim();
        if (normalizedNamespace) {
          handles.add(normalizedNamespace);
        }
      }

      const normalizedEntityName = state.currentEntityName.trim();
      if (normalizedEntityName) {
        handles.add(normalizedEntityName);
      }
    }

    return [...handles];
  }

  async function loadTranslationsBatch(keys: string[]) {
    const translationHandles = getTranslationHandles(keys);
    if (translationHandles.length === 0) {
      return;
    }

    const locale = i18n.global.locale.value;
    const cacheKey = getTranslationBatchCacheKey(translationHandles, locale);
    let promise = genericTranslationLoadCache.get(cacheKey);

    if (!promise) {
      promise = new TranslationService()
        .prepare(...translationHandles)
        .then(() => undefined)
        .catch((error) => {
          genericTranslationLoadCache.delete(cacheKey);
          throw error;
        });
      genericTranslationLoadCache.set(cacheKey, promise);
    }

    await promise;
  }

  function queueTranslationLoad(...keys: string[]) {
    const normalizedKeys = [...new Set(keys.map(normalizeEntityHandle).filter(Boolean))];
    if (normalizedKeys.length === 0) {
      return Promise.resolve();
    }

    for (const key of normalizedKeys) {
      queuedTranslationKeys.add(key);
    }

    if (!queuedTranslationPromise) {
      queuedTranslationPromise = Promise.resolve().then(async () => {
        try {
          while (queuedTranslationKeys.size > 0) {
            const batchKeys = [...queuedTranslationKeys];
            queuedTranslationKeys.clear();
            beginLoading(...batchKeys);

            try {
              await loadTranslationsBatch(batchKeys);
            } finally {
              endLoading(...batchKeys);
            }
          }
        } finally {
          queuedTranslationPromise = null;
        }
      });
    }

    return queuedTranslationPromise;
  }

  // Initialisiere State für einen Key
  function initState(entityHandle: string, namespaces: string[]) {
    const normalizedEntityHandle = normalizeEntityHandle(entityHandle);
    const normalizedNamespaces = namespaces
      .map((namespace) => namespace.trim())
      .filter(Boolean);

    if (!entityStates.has(normalizedEntityHandle)) {
      entityStates.set(normalizedEntityHandle, {
        isLoading: true,
        entity: null,
        entityPermission: null,
        entityTranslation: new TranslationService(),
        entityTemplates: [],
        currentEntityName: normalizedEntityHandle,
        currentNamespaces: normalizedNamespaces,
      });
    } else {
      // Update entityHandle/namespaces falls neu
      const state = entityStates.get(normalizedEntityHandle)!;
      state.currentEntityName = normalizedEntityHandle;
      state.currentNamespaces = normalizedNamespaces;
    }
  }

  // Watch for language changes and reload translations for all entity states
  watch(() => i18n.global.locale.value, async () => {
    await queueTranslationLoad(...entityStates.keys());
  });

  // Haupt-Loader
  async function loadGeneric(entityHandle: string, ...namespaces: string[]) {
    const normalizedEntityHandle = normalizeEntityHandle(entityHandle);
    if (!normalizedEntityHandle) {
      return;
    }

    initState(normalizedEntityHandle, namespaces);

    // Check if a promise already exists for this entityHandle
    let promise = genericLoadCache.get(normalizedEntityHandle);
    if (promise) {
      return promise; // Return the existing promise if state already exists
    }

    // If no promise exists, set isLoading to true and load data
    beginLoading(normalizedEntityHandle);
    const translationPromise = queueTranslationLoad(normalizedEntityHandle);
    promise = (async () => {
      try {
        await Promise.all([
          loadEntity(normalizedEntityHandle),
          loadTemplates(normalizedEntityHandle),
          loadPermissions(normalizedEntityHandle),
          translationPromise,
        ]);
      } finally {
        endLoading(normalizedEntityHandle);
      }
    })().catch((error) => {
      genericLoadCache.delete(normalizedEntityHandle);
      throw error;
    });

    genericLoadCache.set(normalizedEntityHandle, promise);
    return promise;
  }

  async function loadGenericMany(requests: GenericLoadRequest[]) {
    const normalizedRequests = requests
      .map(({ entityHandle, namespaces }) => ({
        entityHandle: normalizeEntityHandle(entityHandle),
        namespaces,
      }))
      .filter(({ entityHandle }) => Boolean(entityHandle));

    if (normalizedRequests.length === 0) {
      return;
    }

    await Promise.all(
      normalizedRequests.map(({ entityHandle, namespaces }) => loadGeneric(entityHandle, ...namespaces)),
    );
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

  // Zugriff auf State für einen Key
  function getState(key: string): EntityState {
    const normalizedKey = normalizeEntityHandle(key);

    if (!entityStates.has(normalizedKey)) {
      // Default-Objekt zurückgeben, damit kein Fehler geworfen wird
      return {
        isLoading: true,
        entity: null,
        entityPermission: null,
        entityTranslation: new TranslationService(),
        entityTemplates: [],
        currentEntityName: normalizedKey,
        currentNamespaces: [],
      };
    }
    return entityStates.get(normalizedKey)!;
  }

  return {
    entityStates,
    loadGeneric,
    loadGenericMany,
    getState,
  };
});
