// Global cache for entity reference columns to avoid redundant API calls across EntityTableRow instances
import ApiService from '@/services/api.service';
import type { EntityTemplate } from '@/entity/structure';

// Map: referenceName => columns[]
const referenceColumnsMap: Record<string, { key: string, name: string }[]> = {};
const loadingPromises: Record<string, Promise<void>> = {};

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

export function getReferenceColumns(referenceName: string) {
  return referenceColumnsMap[referenceName] || [];
}
