// #region Imports
import { onMounted } from 'vue';
import { useGenericStore } from '@/stores/genericStore';
import type { EntityItem, SaplingGenericItem } from '@/entity/entity';
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import { i18n } from '@/i18n';
import { getTableHeaders } from '@/utils/saplingTableUtil';
import { NAVIGATION_URL } from '@/constants/project.constants';
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
        return getTableHeaders(storeState.entityTemplates, storeState.entity, i18n.global.t);
    };
    // #endregion

    // #region Entity Loader
    function navigateToAddress(item: SaplingGenericItem) {
        const navigationTemplates = entityTemplates.filter(t => t.options?.includes('isNavigation'));

        if (!navigationTemplates?.length) return;
        if (!item) return;

        // Build address from item properties
        const addressParts = navigationTemplates.map(n => item[n.name || '']).filter(Boolean);
        const address = addressParts.join(' ');

        if (!address) return;

        const url = `${NAVIGATION_URL}${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    }
    // #endregion

    // #endregion
    return {
        references,
        getHeaders,
        ensureReferenceData,
        navigateToAddress,
    };
    // #endregion
}