// #region Imports
import { onMounted, reactive, watch } from 'vue';
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
    const references = reactive<Record<string, ReturnType<typeof useGenericStore>>>({});
    const referencesLoading: Record<string, Promise<void>> = {};


    // Lade Referenzen initial und bei Änderung der entityTemplates
    onMounted(() => loadReferenceData());
    watch(
        () => entityTemplates.map(t => t.referenceName).join(','),
        () => {
            loadReferenceData();
        }
    );

    async function loadReferenceData(kind : string[] = ['m:1']) {
        const columns = entityTemplates.filter(x => kind.includes(x.kind || '') && x.referenceName);
        const uniqueNames = Array.from(new Set(columns.map(x => x.referenceName)));
        // Lade alle Referenzen nacheinander, damit reaktive Updates garantiert werden
        for (const name of uniqueNames) {
            await ensureReferenceData(name!);
        }
    }

    async function ensureReferenceData(referenceName: string): Promise<void> {
        if (!referenceName || references[referenceName]) return;
        if (referencesLoading[referenceName]) return referencesLoading[referenceName];

        // Für jede Referenz einen eigenen Store erzeugen
        const store = useGenericStore();
        // Vue reactivity: set property explizit
        references[referenceName] = store;

        const promise = store.loadGeneric(referenceName, 'global');
        referencesLoading[referenceName] = promise;
        await promise;
    }

    // Zugriff auf den isolierten State für diesen Key
    function getStoreState(key: string) {
        const state = genericStore.entityStates.get(key);
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