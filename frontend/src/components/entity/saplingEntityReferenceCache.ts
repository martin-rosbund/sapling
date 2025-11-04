/**
 * Global cache for entity reference columns to avoid redundant API calls across SaplingEntityRow instances.
 * Provides utility functions to ensure and retrieve reference columns and templates for a given entity.
 */

// #region Imports
import ApiService from '@/services/api.service';
import type { EntityTemplate } from '@/entity/structure';
// #endregion

// #region Reference Cache State
/**
 * Map of referenceName to array of column definitions ({ key, name }).
 */
const referenceColumnsMap: Record<string, { key: string, name: string }[]> = {};
/**
 * Map of referenceName to array of EntityTemplate objects.
 */
const referenceTemplatesMap: Record<string, EntityTemplate[]> = {};
/**
 * Map of referenceName to loading promises to prevent duplicate API calls.
 */
const loadingPromises: Record<string, Promise<void>> = {};
// #endregion

// #region Reference Cache Functions
/**
 * Ensures that the reference columns and templates for a given entity are loaded and cached.
 * If already loaded or loading, does nothing or waits for the existing promise.
 * @param referenceName Name of the referenced entity.
 * @returns Promise that resolves when columns and templates are loaded.
 */
export async function ensureReferenceColumns(referenceName: string): Promise<void> {
  if (!referenceName || referenceColumnsMap[referenceName]) return;
  if (loadingPromises[referenceName]) return loadingPromises[referenceName];
  loadingPromises[referenceName] = (async () => {
    // Fetch all templates for the referenced entity
    const templates = await ApiService.findAll<EntityTemplate[]>(`template/${referenceName}`);
    // Cache only non-system, non-auto-increment, non-reference columns for quick display
    referenceColumnsMap[referenceName] = templates
      .filter(t => !t.isSystem && !t.isAutoIncrement && !t.isReference)
      .map(t => ({ key: t.name, name: t.name }));
    // Cache all templates for advanced use
    referenceTemplatesMap[referenceName] = templates;
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

/**
 * Retrieves the cached reference templates for a given entity.
 * @param referenceName Name of the referenced entity.
 * @returns Array of template objects, or empty array if not loaded.
 */
export function getReferenceTemplates(referenceName: string) {
  return referenceTemplatesMap[referenceName] || [];
}
// #endregion
