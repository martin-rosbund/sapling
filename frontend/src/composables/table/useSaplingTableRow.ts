// #region Imports
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useGenericStore } from '@/stores/genericStore';
import type { EntityItem, SaplingGenericItem } from '@/entity/entity';
import type {
    AccumulatedPermission,
    EntityTemplate,
    SaplingTableHeaderItem,
} from '@/entity/structure';
import { i18n } from '@/i18n';
import { getTableHeaders } from '@/utils/saplingTableUtil';
import { NAVIGATION_URL } from '@/constants/project.constants';
import { formatValue } from '@/utils/saplingFormatUtil';
// #endregion

type ContextMenuAction = {
    type: string;
    item: SaplingGenericItem;
};

const REFERENCE_COLUMN_KINDS = ['m:1'];

export interface UseSaplingTableRowProps {
    item: SaplingGenericItem;
    columns: SaplingTableHeaderItem[];
    index: number;
    selectedRow: number | null;
    selectedRows?: number[];
    multiSelect?: boolean;
    entityHandle: string;
    entity: EntityItem | null;
    entityPermission: AccumulatedPermission | null;
    entityTemplates: EntityTemplate[];
    showActions: boolean;
}

export type UseSaplingTableRowEmit = {
    (event: 'select-row', value: number): void;
    (event: 'edit', value: SaplingGenericItem): void;
    (event: 'delete', value: SaplingGenericItem): void;
    (event: 'show', value: SaplingGenericItem): void;
    (event: 'copy', value: SaplingGenericItem): void;
    (event: 'favorite'): void;
};

/**
 * Encapsulates row interactions, context menu handling and referenced entity helpers.
 */
export function useSaplingTableRow(props: UseSaplingTableRowProps, emit: UseSaplingTableRowEmit) {
    // #region State
    const genericStore = useGenericStore();
    const referenceLoadPromises = reactive<Record<string, Promise<void> | undefined>>({});
    const loadedReferences = reactive<Record<string, boolean>>({});

    const showUploadDialog = ref(false);
    const uploadDialogItem = ref<SaplingGenericItem | null>(null);
    const menuActive = ref(false);
    const showDialogMap = ref<Record<string, boolean>>({});
    const contextMenu = reactive({
        show: false,
        x: 0,
        y: 0,
        item: null as SaplingGenericItem | null,
        index: -1,
    });

    const hasActionsColumn = computed(() => props.columns.some((column) => column.key === '__actions'));
    const canNavigate = computed(() => props.entityTemplates.some((template) => template.options?.includes('isNavigation')));
    // #endregion

    // #region Lifecycle
    onMounted(() => {
        void loadReferenceData();
        window.addEventListener('sapling-contextmenu-open', closeContextMenu);
    });

    onUnmounted(() => {
        window.removeEventListener('sapling-contextmenu-open', closeContextMenu);
    });
    // #endregion

    // #region Watchers
    watch(
        () => props.entityTemplates.map((template) => `${template.referenceName ?? ''}:${template.kind ?? ''}`).join('|'),
        () => {
            void loadReferenceData();
        },
    );

    watch(
        () => [props.entityHandle, props.columns.map((column) => column.referenceName ?? '').join('|')] as const,
        () => {
            props.columns.forEach((column) => {
                if (column.referenceName) {
                    void ensureReferenceData(column.referenceName);
                }
            });
        },
        { immediate: true },
    );
    // #endregion

    // #region Reference Data
    async function loadReferenceData(kinds: string[] = REFERENCE_COLUMN_KINDS) {
        const referenceNames = Array.from(new Set(
            props.entityTemplates
                .filter((template) => kinds.includes(template.kind ?? '') && template.referenceName)
                .map((template) => template.referenceName as string),
        ));

        for (const referenceName of referenceNames) {
            await ensureReferenceData(referenceName);
        }
    }

    async function ensureReferenceData(referenceName?: string): Promise<void> {
        if (!referenceName) {
            return;
        }

        const state = genericStore.getState(referenceName);
        if (loadedReferences[referenceName] || (state.entityTemplates.length > 0 && !state.isLoading)) {
            loadedReferences[referenceName] = true;
            return;
        }

        if (referenceLoadPromises[referenceName]) {
            return referenceLoadPromises[referenceName];
        }

        const promise = genericStore.loadGeneric(referenceName, 'global')
            .then(() => {
                loadedReferences[referenceName] = true;
            })
            .finally(() => {
                delete referenceLoadPromises[referenceName];
            });

        referenceLoadPromises[referenceName] = promise;
        await promise;
    }

    function getReferenceState(referenceName?: string) {
        return referenceName ? genericStore.getState(referenceName) : null;
    }

    function getReferenceTemplates(referenceName?: string) {
        return getReferenceState(referenceName)?.entityTemplates ?? [];
    }

    function getReferenceEntity(referenceName?: string) {
        return getReferenceState(referenceName)?.entity ?? null;
    }

    function isReferenceColumn(column: EntityTemplate) {
        return REFERENCE_COLUMN_KINDS.includes(column.kind ?? '') && Boolean(column.referenceName);
    }

    function isReferenceLoading(column: EntityTemplate) {
        if (!column.referenceName) {
            return false;
        }

        return getReferenceState(column.referenceName)?.isLoading ?? Boolean(referenceLoadPromises[column.referenceName]);
    }

    function getCompactPanelTitle(column: EntityTemplate, item: SaplingGenericItem): string {
        const key = column.key;
        const referenceValue = key ? item[key] : null;
        if (!column.referenceName || !referenceValue || typeof referenceValue !== 'object') {
            return '';
        }

        const headers = getTableHeaders(
            getReferenceTemplates(column.referenceName),
            getReferenceEntity(column.referenceName),
            i18n.global.t,
        );

        const valueMap = referenceValue as Record<string, unknown>;
        return headers
            .filter((header) => header.options?.includes('isShowInCompact'))
            .map((header) => formatValue(String(valueMap[String(header.key ?? '')] ?? ''), header.type))
            .filter((value) => value && value !== '-')
            .join(' | ');
    }
    // #endregion

    // #region Row Dialogs
    function openDialogForCol(columnKey: string) {
        showDialogMap.value[columnKey] = true;
    }

    function closeDialogForCol(columnKey: string) {
        showDialogMap.value[columnKey] = false;
    }

    function isDialogOpenForCol(columnKey: string) {
        return Boolean(showDialogMap.value[columnKey]);
    }

    function openUploadDialog(item: SaplingGenericItem) {
        uploadDialogItem.value = item;
        showUploadDialog.value = true;
    }

    function closeUploadDialog() {
        showUploadDialog.value = false;
        uploadDialogItem.value = null;
    }
    // #endregion

    // #region Menu and Actions
    function closeMenu() {
        menuActive.value = false;
    }

    function closeContextMenu() {
        contextMenu.show = false;
    }

    function openContextMenu(event: MouseEvent, item: SaplingGenericItem, index: number) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('sapling-contextmenu-open'));
        contextMenu.x = event.clientX;
        contextMenu.y = event.clientY;
        contextMenu.item = item;
        contextMenu.index = index;
        contextMenu.show = true;
    }

    function onContextMenuAction({ type, item }: ContextMenuAction) {
        switch (type) {
            case 'edit':
                requestEdit(item);
                break;
            case 'show':
                requestShow(item);
                break;
            case 'delete':
                requestDelete(item);
                break;
            case 'navigate':
                requestNavigate(item);
                break;
            case 'copy':
                requestCopy(item);
                break;
            case 'favorite':
                requestFavorite();
                break;
            case 'uploadDocument':
                requestUploadDocument(item);
                break;
            case 'showDocuments':
                requestShowDocuments(item);
                break;
            default:
                break;
        }

        closeContextMenu();
    }

    function onRowMouseDown(event: MouseEvent, index: number) {
        if (event.button === 0) {
            emit('select-row', index);
        }
    }

    function requestEdit(item: SaplingGenericItem) {
        closeMenu();
        emit('edit', item);
    }

    function requestShow(item: SaplingGenericItem) {
        closeMenu();
        emit('show', item);
    }

    function requestDelete(item: SaplingGenericItem) {
        closeMenu();
        emit('delete', item);
    }

    function requestCopy(item: SaplingGenericItem) {
        closeMenu();
        emit('copy', item);
    }

    function requestFavorite() {
        closeMenu();
        emit('favorite');
    }

    function requestNavigate(item: SaplingGenericItem) {
        closeMenu();
        navigateToAddress(item);
    }

    function requestUploadDocument(item: SaplingGenericItem) {
        closeMenu();
        openUploadDialog(item);
    }

    function requestShowDocuments(item: SaplingGenericItem) {
        closeMenu();
        navigateToDocuments(item);
    }
    // #endregion

    // #region Cell Helpers
    function getNormalizedType(column: EntityTemplate): string {
        return String(column.type ?? '').toLowerCase();
    }

    function isDateTimeColumn(column: EntityTemplate): boolean {
        return getNormalizedType(column) === 'datetime';
    }

    function isDateColumn(column: EntityTemplate): boolean {
        return ['date', 'datetype'].includes(getNormalizedType(column));
    }

    function isTimeColumn(column: EntityTemplate): boolean {
        return getNormalizedType(column) === 'time';
    }

    function getCellValue(item: SaplingGenericItem, key: string | number | symbol | null | undefined) {
        if (!key) {
            return null;
        }

        const value = item[String(key)];
        if (value == null || typeof value === 'string' || value instanceof Date) {
            return value;
        }

        return String(value);
    }

    function getColumnCellClass(column: SaplingTableHeaderItem) {
        const cellProps = (column as { cellProps?: { class?: string } }).cellProps;
        return cellProps?.class;
    }

    function formatLink(value: string): string {
        if (!value) {
            return '';
        }

        return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    }
    // #endregion

    // #region Navigation
    function navigateToAddress(item: SaplingGenericItem) {
        const navigationTemplates = props.entityTemplates.filter((template) => template.options?.includes('isNavigation'));
        if (!navigationTemplates.length) {
            return;
        }

        const address = navigationTemplates
            .map((template) => item[template.name || ''])
            .filter(Boolean)
            .join(' ');

        if (!address) {
            return;
        }

        const url = `${NAVIGATION_URL}${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    }

    function navigateToDocuments(item: SaplingGenericItem) {
        if (item.handle == null) {
            return;
        }

        const url = `/file/document?filter={"reference":"${String(item.handle)}","entity":"${props.entityHandle}"}`;
        window.open(url, '_blank');
    }
    // #endregion

    // #region Return
    return {
        showUploadDialog,
        uploadDialogItem,
        menuActive,
        contextMenu,
        hasActionsColumn,
        canNavigate,
        openContextMenu,
        onContextMenuAction,
        onRowMouseDown,
        openDialogForCol,
        closeDialogForCol,
        isDialogOpenForCol,
        closeMenu,
        requestEdit,
        requestShow,
        requestDelete,
        requestCopy,
        requestFavorite,
        requestNavigate,
        requestUploadDocument,
        requestShowDocuments,
        closeUploadDialog,
        getReferenceTemplates,
        getReferenceEntity,
        isReferenceColumn,
        isReferenceLoading,
        getCompactPanelTitle,
        isDateTimeColumn,
        isDateColumn,
        isTimeColumn,
        getCellValue,
        getColumnCellClass,
        formatLink,
    };
    // #endregion
}