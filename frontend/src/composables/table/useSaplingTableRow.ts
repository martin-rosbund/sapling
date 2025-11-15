// #region Imports
import { onMounted, ref, watch } from 'vue';
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

    // #region Utility Functions
    /**
     * Formats a value for display in entity tables based on its type (e.g., date, datetime, etc.).
     * @param value The value to format.
     * @param type The type of the value (e.g., 'date', 'datetime').
     * @returns The formatted value as a string.
     */
    function formatValue(value: string, type?: string): string {
        switch (type?.toLocaleLowerCase()) {
        case 'datetime':
        case 'datetype':
        case 'date':
            return formatDate(value, type);
        default:
            return value;
        }
    }

    /**
     * Formats a date value for display based on its type.
     * @param value The date value (string or Date).
     * @param type The type of the value (e.g., 'datetime', 'date').
     * @returns The formatted date as a string.
     */
    function formatDate(value: string | Date, type?: string): string {
        if (!value) return '';
        const date = new Date(value);
        switch (type?.toLocaleLowerCase()) {
        case 'datetime':
            return date.toLocaleString();
        default:
            return date.toLocaleDateString();
        }
    }
    // #endregion

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
            await genericStore.loadGeneric(referenceName, referenceName, 'global');
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
    return {
        references,
        formatValue,
        formatDate,
        getHeaders
    };
}
// #endregion
