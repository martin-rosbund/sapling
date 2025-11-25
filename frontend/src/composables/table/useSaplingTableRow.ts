// #region Imports
import { onMounted } from 'vue';
import { useGenericStore } from '@/stores/genericStore';
import type { EntityItem } from '@/entity/entity';
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import { ENTITY_SYSTEM_COLUMNS } from '@/constants/project.constants';
import { i18n } from '@/i18n';
// #endregion

// #region useSaplingTableRow Composable
/**
 * Composable for SaplingTableRow logic and formatting utilities.
 */
export function useSaplingTableRow(
    entityName: string,
    entity: EntityItem | null,
    entityPermission: AccumulatedPermission | null,
    entityTemplates: EntityTemplate[]
) {
    // Use genericStore for reference data
    const genericStore = useGenericStore();
    const references: Record<string, ReturnType<typeof useGenericStore>> = {};
    const referencesLoading: Record<string, Promise<void>> = {};

    // #region Entity Loader
    const genericLoader = useGenericStore();

    onMounted(() => loadReferenceData());

    async function loadReferenceData(kind : string[] = ['m:1']) {
        const columns = entityTemplates.filter(x => kind.includes(x.kind || '') && x.referenceName);
        const uniqueNames = Array.from(new Set(columns.map(x => x.referenceName)));
        await Promise.all(uniqueNames.map(x => ensureReferenceData(x!)));
    }

    async function ensureReferenceData(referenceName: string): Promise<void> {
        if (!referenceName || references[referenceName]) return;
        if (referencesLoading[referenceName]) return referencesLoading[referenceName];

        const promise = (async () => {
            // Use genericStore for referenceName, key = referenceName
            references[referenceName] = genericStore;
            await genericStore.loadGeneric(referenceName, 'global');
        })();
        referencesLoading[referenceName] = promise;
        await promise;
    }

    // Zugriff auf den isolierten State für diesen Key
    function getStoreState(key: string) {
        const state = genericLoader.entityStates.get(key);
        if (!state) {
        // Fallback: leere Werte, damit keine Fehler entstehen
        return {
            entity: null,
            entityPermission: null,
            entityTranslation: undefined,
            entityTemplates: [],
            isLoading: true,
            currentEntityName: '',
            currentNamespaces: [],
        };
        }
        return state;
    }

    // #region Header Generation
    const getHeaders = (key: string) => {
        const storeState = getStoreState(key);
        // If still loading, return headers with empty title to avoid translation lookup
        if (storeState.isLoading) {
            return storeState.entityTemplates.filter((x: EntityTemplate) => {
                const template = storeState.entityTemplates.find((t: EntityTemplate) => t.name === x.name);
                return !ENTITY_SYSTEM_COLUMNS.includes(x.name) && !(template && (template.isAutoIncrement || ['m:1', '1:m', 'm:n', 'n:m'].includes(template.kind || '')));
            }).map((template: EntityTemplate) => ({
                ...template,
                key: template.name,
                title: ''
            }));
        }
        return storeState.entityTemplates.filter((x: EntityTemplate) => {
            const template = storeState.entityTemplates.find((t: EntityTemplate) => t.name === x.name);
            return !ENTITY_SYSTEM_COLUMNS.includes(x.name) && !(template && (template.isAutoIncrement || ['m:1', '1:m', 'm:n', 'n:m'].includes(template.kind || '')));
        }).map((template: EntityTemplate) => ({
            ...template,
            key: template.name,
            title: i18n.global.t(`${storeState.currentEntityName}.${template.name}`)
        }));
    };
  // #endregion

    // #endregion
        return {
            references,
            getHeaders,
            ensureReferenceData,
        };
    // #endregion
}