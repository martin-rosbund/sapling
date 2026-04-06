import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  ColumnFilterOperator,
  EditDialogOptions,
  EntityTemplate,
  SaplingTableHeaderItem,
  SortItem,
} from '@/entity/structure';
import type { EntityItem, FavoriteItem, SaplingGenericItem } from '@/entity/entity';
import { DEFAULT_ENTITY_ITEMS_COUNT } from '@/constants/project.constants';
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import {
  buildTableFilter,
  buildTableOrderBy,
  getAllowedColumnFilterOperators,
  getDefaultColumnFilterOperatorForTemplate,
  getTableHeaders,
  isFilterableTableColumn,
} from '@/utils/saplingTableUtil';

interface FavoriteDialogState {
  visible: boolean;
  title: string;
}

interface DeleteDialogState {
  visible: boolean;
  item: SaplingGenericItem | null;
}

interface BulkDeleteDialogState {
  visible: boolean;
  items: SaplingGenericItem[];
}

type TableColumnLike = Record<string, unknown> & {
  key: string | null;
  title?: string | null;
  name?: string;
  type?: string;
  kind?: string;
  referenceName?: string;
  referencedPks?: unknown;
  length?: number;
  options?: unknown;
  isReference?: boolean;
};

type FavoriteFormRef = {
  validate?: () => Promise<boolean | { valid: boolean }>;
};

export interface UseSaplingTableProps {
  items: SaplingGenericItem[];
  parent?: SaplingGenericItem | null;
  parentEntity?: EntityItem | null;
  search: string;
  page: number;
  itemsPerPage: number;
  totalItems: number;
  isLoading: boolean;
  sortBy: SortItem[];
  entityHandle: string;
  entity: EntityItem | null;
  entityPermission: AccumulatedPermission | null;
  entityTemplates: EntityTemplate[];
  parentFilter?: Record<string, unknown>;
  columnFilters?: Record<string, ColumnFilterItem>;
  activeFilter?: FilterQuery;
  showActions: boolean;
  tableKey: string;
  headers?: SaplingTableHeaderItem[];
  multiSelect?: boolean;
  selected?: SaplingGenericItem[];
  isOpenEditDialog?: boolean;
}

export type UseSaplingTableEmit = {
  (event: 'update:search', value: string): void;
  (event: 'update:page', value: number): void;
  (event: 'update:itemsPerPage', value: number): void;
  (event: 'update:sortBy', value: SortItem[]): void;
  (event: 'update:columnFilters', value: Record<string, ColumnFilterItem>): void;
  (event: 'reload'): void;
  (event: 'update:selected', value: SaplingGenericItem[]): void;
};

const MIN_COLUMN_WIDTH = 200;
const MIN_ACTION_WIDTH = 80;
const FILTER_OPERATOR_OPTIONS: Array<{ label: string; value: ColumnFilterOperator }> = [
  { label: '~', value: 'like' },
  { label: 'a*', value: 'startsWith' },
  { label: '*a', value: 'endsWith' },
  { label: '=', value: 'eq' },
  { label: '>', value: 'gt' },
  { label: '>=', value: 'gte' },
  { label: '<', value: 'lt' },
  { label: '<=', value: 'lte' },
];

/**
 * Encapsulates the local UI workflow for the shared data table.
 * Keeps dialog, selection and column filter state out of the component template.
 */
export function useSaplingTableComponent(props: UseSaplingTableProps, emit: UseSaplingTableEmit) {
  // #region State
  const { t } = useI18n();
  const currentPersonStore = useCurrentPersonStore();

  const localColumnFilters = ref<Record<string, ColumnFilterItem>>(cloneColumnFilters(props.columnFilters));
  const selectedRows = ref<number[]>([]);
  const selectedRow = ref<number | null>(null);
  const editDialog = ref<EditDialogOptions>({ visible: false, mode: 'create', item: null });
  const deleteDialog = ref<DeleteDialogState>({ visible: false, item: null });
  const bulkDeleteDialog = ref<BulkDeleteDialogState>({ visible: false, items: [] });
  const favoriteDialog = ref<FavoriteDialogState>({ visible: false, title: '' });
  const favoriteFormRef = ref<FavoriteFormRef | null>(null);
  const initialEditDialogShown = ref(false);
  const tableContainerRef = ref<HTMLElement | null>(null);
  const containerWidth = ref(0);

  let resizeObserver: ResizeObserver | null = null;

  const selectedItems = computed(() =>
    selectedRows.value
      .map((index) => props.items[index])
      .filter((item): item is SaplingGenericItem => Boolean(item)),
  );
  // #endregion

  // #region Lifecycle
  onMounted(() => {
    if (!tableContainerRef.value) {
      return;
    }

    resizeObserver = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) {
        containerWidth.value = entry.contentRect.width;
      }
    });

    resizeObserver.observe(tableContainerRef.value);
    containerWidth.value = tableContainerRef.value.offsetWidth;
  });

  onBeforeUnmount(() => {
    if (resizeObserver && tableContainerRef.value) {
      resizeObserver.unobserve(tableContainerRef.value);
      resizeObserver.disconnect();
    }

    resizeObserver = null;
  });
  // #endregion

  // #region Watchers
  watch(
    () => props.columnFilters,
    (value) => {
      localColumnFilters.value = cloneColumnFilters(value);
    },
    { deep: true },
  );

  watch(
    () => [props.selected, props.items, props.multiSelect] as const,
    ([newSelected]) => {
      const nextSelected = Array.isArray(newSelected) ? newSelected : [];

      selectedRows.value = props.items
        .map((item, index) => nextSelected.some((selectedItem) => areSameGenericItems(item, selectedItem)) ? index : -1)
        .filter((index) => index !== -1);

      selectedRow.value = props.multiSelect ? null : selectedRows.value[0] ?? null;
    },
    { deep: true, immediate: true },
  );

  watch(
    () => [props.items, props.isOpenEditDialog] as const,
    ([items, isOpenEditDialog]) => {
      if (
        isOpenEditDialog
        && Array.isArray(items)
        && items.length > 0
        && !editDialog.value.visible
        && !initialEditDialogShown.value
      ) {
        editDialog.value = { visible: true, mode: 'edit', item: items[0] ?? null };
        initialEditDialogShown.value = true;
      }

      if (!isOpenEditDialog) {
        initialEditDialogShown.value = false;
      }
    },
    { deep: true, immediate: true },
  );
  // #endregion

  // #region Computed
  const visibleHeaders = computed<SaplingTableHeaderItem[]>(() => {
    const baseHeaders = props.headers?.length
      ? props.headers
      : getTableHeaders(props.entityTemplates, props.entity, t);

    const totalWidth = containerWidth.value > 0 ? containerWidth.value : window.innerWidth;
    const reservedActionWidth = props.showActions ? MIN_ACTION_WIDTH : 0;
    const maxVisibleColumns = Math.max(1, Math.floor((totalWidth - reservedActionWidth) / MIN_COLUMN_WIDTH));

    let headers = baseHeaders
      .filter((header) => header.key !== '__select' && header.key !== '__actions')
      .slice(0, maxVisibleColumns);

    if (props.multiSelect) {
      headers = [{ key: '__select', title: '', name: '__select', type: 'select' }, ...headers];
    }

    if (props.showActions) {
      headers = [...headers, { key: '__actions', title: '', name: '__actions', type: 'actions' }];
    }

    return headers;
  });
  // #endregion

  // #region Table Interaction
  function onSearchUpdate(value: string) {
    emit('update:search', value);
  }

  function onPageUpdate(value: number) {
    emit('update:page', value);
  }

  function onItemsPerPageUpdate(value: number | string) {
    const limit = value === -1 ? DEFAULT_ENTITY_ITEMS_COUNT : Number(value);
    emit('update:itemsPerPage', limit);
  }

  function onSortByUpdate(value: SortItem[]) {
    const filteredSort = value.filter((item) => item.key !== '__actions');
    if (filteredSort.length !== value.length) {
      return;
    }

    emit('update:sortBy', filteredSort);
  }

  function selectAllRows() {
    selectedRows.value = props.items.map((_, index) => index);
    emitSelectedItems();
  }

  function selectRow(index: number) {
    const nextItem = props.items[index];
    if (!nextItem) {
      return;
    }

    if (props.multiSelect) {
      const selectedIndex = selectedRows.value.indexOf(index);
      if (selectedIndex === -1) {
        selectedRows.value = [...selectedRows.value, index];
      } else {
        selectedRows.value = selectedRows.value.filter((rowIndex) => rowIndex !== index);
      }

      emitSelectedItems();
      return;
    }

    selectedRow.value = index;
    emit('update:selected', [nextItem]);
  }

  function clearSelection() {
    selectedRows.value = [];
    selectedRow.value = null;
    emit('update:selected', []);
  }

  function emitSelectedItems() {
    emit('update:selected', selectedItems.value);
  }
  // #endregion

  // #region Column Filters
  function onColumnFilterChange(key: string, filter: ColumnFilterItem | null) {
    const nextFilters = { ...localColumnFilters.value };

    if (!filter) {
      delete nextFilters[key];
      localColumnFilters.value = nextFilters;
      emit('update:columnFilters', nextFilters);
      return;
    }

    const normalizedFilter = normalizeColumnFilterItem(props.entityTemplates, key, filter);
    if (isEmptyColumnFilterItem(normalizedFilter)) {
      delete nextFilters[key];
    } else {
      nextFilters[key] = normalizedFilter;
    }

    localColumnFilters.value = nextFilters;
    emit('update:columnFilters', nextFilters);
  }

  function getColumnFilterItem(key: string) {
    const filter = localColumnFilters.value[key];
    if (!filter) {
      return undefined;
    }

    return {
      ...filter,
      relationItems: filter.relationItems?.map((item) => ({ ...item })),
    };
  }

  function getFilterOperatorOptions(column: TableColumnLike) {
    return FILTER_OPERATOR_OPTIONS.filter((option) =>
      getAllowedColumnFilterOperators(normalizeColumnTemplate(column)).includes(option.value),
    );
  }

  function isColumnFilterable(column: TableColumnLike) {
    const normalizedColumn = normalizeColumnTemplate(column);
    return normalizedColumn ? isFilterableTableColumn(normalizedColumn) : false;
  }
  // #endregion

  // #region Entity Actions
  async function downloadJSON() {
    if (!props.entityHandle) {
      return;
    }

    const filter = props.activeFilter ?? buildTableFilter({
      search: props.search,
      columnFilters: localColumnFilters.value,
      entityTemplates: props.entityTemplates,
      parentFilter: props.parentFilter,
    });

    const json = await ApiGenericService.downloadJSON(props.entityHandle, {
      filter,
      orderBy: buildTableOrderBy(props.sortBy),
      relations: ['m:1'],
    });

    downloadJSONFile(json, `${props.entityHandle}.json`);
  }

  function exportSelectedJSON() {
    if (!props.entityHandle || selectedItems.value.length === 0) {
      return;
    }

    downloadJSONFile(selectedItems.value, `${props.entityHandle}-selected.json`);
  }

  function downloadJSONFile(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function openCreateDialog() {
    editDialog.value = { visible: true, mode: 'create', item: null };
  }

  function openEditDialog(item: SaplingGenericItem) {
    editDialog.value = { visible: true, mode: 'edit', item };
  }

  function openShowDialog(item: SaplingGenericItem) {
    editDialog.value = { visible: true, mode: 'readonly', item };
  }

  function openCopyDialog(item: SaplingGenericItem) {
    const copiedItem = { ...item };

    props.entityTemplates
      .filter((template) => template.name === 'handle' || template.isUnique)
      .forEach((template) => {
        delete copiedItem[template.name];
      });

    editDialog.value = { visible: true, mode: 'create', item: copiedItem };
  }

  function closeDialog() {
    editDialog.value = { ...editDialog.value, visible: false };
  }

  async function saveDialog(item: SaplingGenericItem) {
    if (!props.entityHandle) {
      return;
    }

    if (editDialog.value.mode === 'edit' && editDialog.value.item) {
      const handle = getItemHandle(editDialog.value.item);
      if (handle == null) {
        return;
      }

      await ApiGenericService.update(props.entityHandle, handle, item);
    } else if (editDialog.value.mode === 'create') {
      await ApiGenericService.create(props.entityHandle, item);
    }

    closeDialog();
    emit('reload');
  }

  function openDeleteDialog(item: SaplingGenericItem) {
    deleteDialog.value = { visible: true, item };
  }

  function closeDeleteDialog() {
    deleteDialog.value = { visible: false, item: null };
  }

  async function confirmDelete() {
    const handle = getItemHandle(deleteDialog.value.item);
    if (handle == null || !props.entityHandle) {
      return;
    }

    await ApiGenericService.delete(props.entityHandle, handle);
    closeDeleteDialog();
    emit('reload');
  }

  function deleteAllSelected() {
    if (!selectedRows.value.length) {
      return;
    }

    bulkDeleteDialog.value = {
      visible: true,
      items: selectedItems.value,
    };
  }

  function closeBulkDeleteDialog() {
    bulkDeleteDialog.value = { visible: false, items: [] };
  }

  async function confirmBulkDelete() {
    if (!props.entityHandle) {
      return;
    }

    for (const item of bulkDeleteDialog.value.items) {
      const handle = getItemHandle(item);
      if (handle != null) {
        await ApiGenericService.delete(props.entityHandle, handle);
      }
    }

    clearSelection();
    closeBulkDeleteDialog();
    emit('reload');
  }
  // #endregion

  // #region Favorites
  function openFavoriteDialog() {
    const trimmedSearch = props.search.trim();
    favoriteDialog.value = {
      visible: true,
      title: trimmedSearch.length > 0
        ? `${getFavoriteEntityTitle()}: ${trimmedSearch}`
        : getFavoriteEntityTitle(),
    };
  }

  function closeFavoriteDialog() {
    favoriteDialog.value = { visible: false, title: '' };
  }

  async function saveFavorite() {
    const validationResult = await favoriteFormRef.value?.validate?.();
    const isValid = typeof validationResult === 'boolean'
      ? validationResult
      : validationResult?.valid ?? true;

    const trimmedTitle = favoriteDialog.value.title.trim();
    if (!isValid || trimmedTitle.length === 0 || !props.entityHandle) {
      return;
    }

    await currentPersonStore.fetchCurrentPerson();
    const personHandle = currentPersonStore.person?.handle;
    if (personHandle == null) {
      return;
    }

    await ApiGenericService.create<FavoriteItem>('favorite', {
      title: trimmedTitle,
      entity: props.entityHandle,
      person: personHandle,
      filter: getCurrentFavoriteFilter(),
    });

    closeFavoriteDialog();
  }

  function getFavoriteEntityTitle() {
    const translationKey = `navigation.${props.entityHandle}`;
    const translatedTitle = t(translationKey);
    return translatedTitle !== translationKey
      ? translatedTitle
      : props.entity?.title ?? props.entityHandle;
  }

  function getCurrentFavoriteFilter() {
    if (!props.activeFilter) {
      return undefined;
    }

    const serializedFilter = JSON.stringify(props.activeFilter);
    if (serializedFilter === '{}' || serializedFilter === 'null') {
      return undefined;
    }

    return JSON.parse(serializedFilter) as FilterQuery;
  }
  // #endregion

  // #region Return
  return {
    tableContainerRef,
    selectedRows,
    selectedRow,
    localColumnFilters,
    visibleHeaders,
    editDialog,
    deleteDialog,
    bulkDeleteDialog,
    favoriteDialog,
    favoriteFormRef,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onSortByUpdate,
    onColumnFilterChange,
    getColumnFilterItem,
    getFilterOperatorOptions,
    isColumnFilterable,
    downloadJSON,
    exportSelectedJSON,
    selectAllRows,
    selectRow,
    clearSelection,
    deleteAllSelected,
    confirmBulkDelete,
    closeBulkDeleteDialog,
    openFavoriteDialog,
    closeFavoriteDialog,
    saveFavorite,
    openCreateDialog,
    openEditDialog,
    openShowDialog,
    openCopyDialog,
    closeDialog,
    saveDialog,
    confirmDelete,
    openDeleteDialog,
    closeDeleteDialog,
  };
  // #endregion
}

function cloneColumnFilters(filters?: Record<string, ColumnFilterItem>) {
  if (!filters) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [key, {
      ...value,
      relationItems: value.relationItems?.map((item) => ({ ...item })),
    }]),
  );
}

function normalizeColumnFilterItem(
  entityTemplates: EntityTemplate[],
  key: string,
  filter: ColumnFilterItem,
): ColumnFilterItem {
  return {
    operator: getNormalizedColumnFilterOperator(entityTemplates, key, filter.operator),
    value: filter.value.trim(),
    rangeStart: filter.rangeStart?.trim() || undefined,
    rangeEnd: filter.rangeEnd?.trim() || undefined,
    relationItems: filter.relationItems?.map((item) => ({ ...item })),
  };
}

function getNormalizedColumnFilterOperator(
  entityTemplates: EntityTemplate[],
  key: string,
  operator: ColumnFilterOperator,
) {
  const template = getColumnTemplate(entityTemplates, key);
  const allowedOperators = getAllowedColumnFilterOperators(template);
  return allowedOperators.includes(operator)
    ? operator
    : getDefaultColumnFilterOperatorForTemplate(template);
}

function isEmptyColumnFilterItem(filter: ColumnFilterItem) {
  return filter.value.length === 0
    && (filter.rangeStart?.length ?? 0) === 0
    && (filter.rangeEnd?.length ?? 0) === 0
    && (filter.relationItems?.length ?? 0) === 0;
}

function getColumnTemplate(entityTemplates: EntityTemplate[], key: string) {
  return entityTemplates.find((item) => item.name === key || item.key === key);
}

function normalizeColumnTemplate(column?: TableColumnLike | Partial<EntityTemplate>) {
  if (!column) {
    return undefined;
  }

  return {
    key: ('key' in column ? column.key : undefined) ?? undefined,
    name: typeof column.name === 'string' ? column.name : undefined,
    type: typeof column.type === 'string' ? column.type : undefined,
    kind: typeof column.kind === 'string' ? column.kind : undefined,
    referenceName: typeof column.referenceName === 'string' ? column.referenceName : undefined,
    referencedPks: Array.isArray(column.referencedPks)
      ? column.referencedPks.filter((key): key is string => typeof key === 'string')
      : undefined,
    length: typeof column.length === 'number' ? column.length : undefined,
    options: Array.isArray(column.options)
      ? column.options.filter((option): option is string => typeof option === 'string') as EntityTemplate['options']
      : undefined,
    isReference: column.isReference === true,
  };
}

function getItemHandle(item?: SaplingGenericItem | null) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const { handle } = item;
  return typeof handle === 'string' || typeof handle === 'number'
    ? handle
    : null;
}

function areSameGenericItems(left?: SaplingGenericItem, right?: SaplingGenericItem) {
  const leftIdentity = getGenericItemIdentity(left);
  const rightIdentity = getGenericItemIdentity(right);
  return leftIdentity.length > 0 && leftIdentity === rightIdentity;
}

function getGenericItemIdentity(item?: SaplingGenericItem) {
  const handle = getItemHandle(item);
  if (handle != null) {
    return `handle:${String(handle)}`;
  }

  return JSON.stringify(item);
}