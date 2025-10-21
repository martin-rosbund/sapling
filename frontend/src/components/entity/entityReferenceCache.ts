
/**
 * Global cache for entity reference columns to avoid redundant API calls across EntityTableRow instances.
 * Provides utility functions to ensure and retrieve reference columns for a given entity.
 */
import ApiService from '@/services/api.service';
import type { EntityTemplate } from '@/entity/structure';

/**
 * Map of referenceName to array of column definitions ({ key, name }).
 */
const referenceColumnsMap: Record<string, { key: string, name: string }[]> = {};

/**
 * Map of referenceName to loading Promise, to prevent duplicate API calls.
 */
const loadingPromises: Record<string, Promise<void>> = {};

/**
 * Ensures that the reference columns for a given entity are loaded and cached.
 * If already loaded or loading, does nothing or waits for the existing promise.
 * @param referenceName Name of the referenced entity.
 * @returns Promise that resolves when columns are loaded.
 */
export async function ensureReferenceColumns(referenceName: string): Promise<void> {
  if (!referenceName || referenceColumnsMap[referenceName]) return;
  if (loadingPromises[referenceName]) return loadingPromises[referenceName];
  loadingPromises[referenceName] = (async () => {
    const templates = await ApiService.findAll<EntityTemplate[]>(`template/${referenceName}`);
    referenceColumnsMap[referenceName] = templates
      .filter(t => !t.isSystem && !t.isAutoIncrement && !t.isReference)
      .map(t => ({ key: t.name, name: t.name }));
  })();
  await loadingPromises[referenceName];
}

/**
 * Retrieves the cached reference columns for a given entity.
 * @param referenceName Name of the referenced entity.
 * @returns Array of column definitions, or empty array if not loaded.
 */
export function getReferenceColumns(referenceName: string) {
  return referenceColumnsMap[referenceName] || [];
}
