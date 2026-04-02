// #region Imports
import { ref, watch, onMounted, computed, type Ref } from 'vue';
import type { AccumulatedPermission, ColumnFilterItem, DialogState, EntityState, EntityTemplate } from '@/entity/structure';
import { useGenericStore } from '@/stores/genericStore';
import ApiGenericService from '@/services/api.generic.service';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import { useI18n } from 'vue-i18n';
import type { EntityItem, SaplingGenericItem } from '@/entity/entity';
import { buildTableFilter, buildTableOrderBy, getEditDialogHeaders, getRelationTableHeaders } from '@/utils/saplingTableUtil';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
// #endregion

export function useSaplingDialogEdit(props: {
  modelValue: boolean;
  mode: DialogState;
  item: SaplingGenericItem | null;
  entity: EntityItem | null;
  templates: EntityTemplate[];
  showReference?: boolean;
}, emit: (event: 'update:modelValue' | 'save' | 'cancel', ...args: unknown[]) => void) {
  // #region Types 
  type VuetifyFormRef = {
    validate: () => Promise<{ valid: boolean } | undefined>;
  };
  // #endregion

  // #region Constants 
  const { t } = useI18n();
  const genericStore = useGenericStore();
  const templates = computed(() => props.templates ?? []);
  const showReference = props.showReference !== false;
  const isLoading = ref(true);
  const form: Ref<SaplingGenericItem> = ref({});
  const formRef: Ref<VuetifyFormRef | null> = ref(null);
  const referenceColumnsMap: Ref<Record<string, EntityTemplate[]>> = ref({});
  const activeTab = ref(0);
  const relationTableItems = ref<Record<string, SaplingGenericItem[]>>({});
  const relationTableSearch = ref<Record<string, string>>({});
  const relationTablePage = ref<Record<string, number>>({});
  const relationTableTotal = ref<Record<string, number>>({});
  const relationTableItemsPerPage = ref<Record<string, number>>({});
  const relationTableSortBy = ref<Record<string, Array<{ key: string; order: 'asc' | 'desc' }>>>({});
  const relationTableColumnFilters = ref<Record<string, Record<string, ColumnFilterItem>>>({});
  const selectedRelations = ref<Record<string, SaplingGenericItem[]>>({});
  const relationTableState = ref<Record<string, EntityState>>({});
  const permissions = ref<AccumulatedPermission[] | null>(null);
  /**
   * Store for managing the current person's data.
   */
  const currentPersonStore = useCurrentPersonStore();
  // #endregion

  // #region Templates 
  const visibleTemplates = computed(() =>
    getEditDialogHeaders(templates.value, props.mode, showReference, permissions.value || [])
  );

  const relationTemplates = computed(() => {
    if(!showReference) {
      return [];
    }
    
    return templates.value.filter(x => ['1:m', 'm:n', 'n:m'].includes(x.kind || '') 
      && !x.options?.includes('isHideAsReference') 
      && permissions?.value?.find(p => p.entityHandle === x.referenceName)?.allowRead);
  });
  // #endregion
  
  // #region Reference
  async function addRelation(template: EntityTemplate) {
    const items = Array.isArray(selectedRelations.value[template.name]) ? selectedRelations.value[template.name] : [];
    switch(template.kind) {
      case '1:m':
        await addRelation1M(template, items ?? []);
        break;
      default:
        await addRelationNM(template, items ?? []);
        break;
    }
    selectedRelations.value[template.name] = [];
    await loadRelationTableItems();
  }
  // #endregion 

  // #region Reference n:m m:n 
  const relationTableHeaders = computed(() =>
    getRelationTableHeaders(relationTableState.value, t)
  );

  async function addRelationNM(template: EntityTemplate, items: SaplingGenericItem[]) {
    const entityHandle = props.entity?.handle ?? '';
    const entityTemplate = props.templates ?? [];
    const entityItem = props.item;
    const referenceName = template.name;
    const referenceTemplate = relationTableState.value[template.name]?.entityTemplates ?? [];

    for (const referenceItem of items) {
      const entityPrimaryKey: Record<string, string | number> = {};
      const referencePrimaryKey: Record<string, string | number> = {};

      entityTemplate.filter(t => t.isPrimaryKey).map(t => t.name).forEach(key => {
        if (entityItem && entityItem[key] !== undefined) {
          entityPrimaryKey[key] = entityItem[key] as string | number;
        }
      });

      referenceTemplate.filter(t => t.isPrimaryKey).map(t => t.name).forEach(key => {
        if (referenceItem && referenceItem[key] !== undefined) {
          referencePrimaryKey[key] = referenceItem[key] as string | number;
        }
      });

      await ApiGenericService.createReference(entityHandle, referenceName, entityPrimaryKey, referencePrimaryKey);
    }
  }

  async function removeRelation(template: EntityTemplate, selectedItems: SaplingGenericItem[]) {
    switch(template.kind) {
      case '1:m':
        await removeRelation1M(template, selectedItems);
        break;
      default:
        await removeRelationNM(template, selectedItems);
        break;
    }
  }

  async function removeRelationNM(template: EntityTemplate, selectedItems: SaplingGenericItem[]) {
    const entityHandle = props.entity?.handle ?? '';
    const entityTemplate = props.templates ?? [];
    const entityItem = props.item;
    const referenceName = template.name;
    const referenceTemplate = relationTableState.value[template.name]?.entityTemplates ?? [];

    for (const referenceItem of selectedItems) {
      const entityPrimaryKey: Record<string, string | number> = {};
      const referencePrimaryKey: Record<string, string | number> = {};

      entityTemplate.filter(t => t.isPrimaryKey).map(t => t.name).forEach(key => {
        if (entityItem && entityItem[key] !== undefined) {
          entityPrimaryKey[key] = entityItem[key] as string | number;
        }
      });

      referenceTemplate.filter(t => t.isPrimaryKey).map(t => t.name).forEach(key => {
        if (referenceItem && referenceItem[key] !== undefined) {
          referencePrimaryKey[key] = referenceItem[key] as string | number;
        }
      });

      await ApiGenericService.deleteReference(entityHandle, referenceName, entityPrimaryKey, referencePrimaryKey);
    }
    await loadRelationTableItems();
  }
  // #endregion

  // #region Reference 1:m
  async function addRelation1M(template: EntityTemplate, items: SaplingGenericItem[]) {
    const mappedBy = template.mappedBy;
    for (const selected of items) {
      const pk: Record<string, string | number> = {};
      if (mappedBy) {
        const refTemplates = relationTableState.value[template.name]?.entityTemplates ?? [];
        const pkNames = refTemplates.filter(t => t.isPrimaryKey).map(t => t.name);
        pkNames.forEach(key => {
          if (props.item && props.item[key] !== undefined) {
            selected[mappedBy] = props.item[key];
            pk[key] = selected[key];
          }
        });
      }
      await ApiGenericService.update(template.referenceName ?? '', pk, selected);
    }
  }

  async function removeRelation1M(template: EntityTemplate, selectedItems: SaplingGenericItem[]) {
    const mappedBy = template.mappedBy;
    for (const selected of selectedItems) {
      const pk: Record<string, string | number> = {};
      if (mappedBy) {
        const refTemplates = relationTableState.value[template.name]?.entityTemplates ?? [];
        const pkNames = refTemplates.filter(t => t.isPrimaryKey).map(t => t.name);
        pkNames.forEach(key => {
          pk[key] = selected[key];
          selected[mappedBy] = null;
        });
      }
      await ApiGenericService.update(template.referenceName ?? '', pk, selected);
    }
    await loadRelationTableItems();
  }
  // #endregion

  // #region Reference Dropdown
  async function initialize() {
    isLoading.value = true;

    await currentPersonStore.fetchCurrentPerson();
    await setEntitiesPermissions();

    const referencePromises = templates.value
      .filter(t => t.isReference)
      .map(ensureReferenceColumns);
    await Promise.all(referencePromises);
    await loadRelationTableTemplates();

    for (const template of relationTemplates.value) {
      relationTableSearch.value[template.name] = '';
      relationTablePage.value[template.name] = 1;
      relationTableTotal.value[template.name] = 0;
      relationTableItemsPerPage.value[template.name] = DEFAULT_PAGE_SIZE_SMALL;
      relationTableColumnFilters.value[template.name] = {};
    }
    await loadRelationTableItems();
    isLoading.value = false;
  }

  async function loadRelationTableTemplates() {
    for (const template of relationTemplates.value) {
      if (!relationTableState.value[template.name]) {
        relationTableState.value[template.name] = {} as EntityState;
      }

      await genericStore.loadGeneric(template.referenceName ?? '', 'global');
      const state = genericStore.getState(template.referenceName ?? '');
      if (relationTableState.value[template.name]) {
        relationTableState.value[template.name]!.entityTemplates = state.entityTemplates;
        relationTableState.value[template.name]!.entity = state.entity;
        relationTableState.value[template.name]!.entityPermission = state.entityPermission;
      }
    }
  }

  async function loadRelationTableItems() {
    for (const template of relationTemplates.value) {
      const relState = relationTableState.value[template.name] ?? (relationTableState.value[template.name] = {} as EntityState);
      
      const filter: Record<string, unknown> = {};
      if (props.item && (template.mappedBy || template.inversedBy)) {
        const refTemplates = relationTableState.value[template.name]?.entityTemplates ?? [];
        const pkNames = refTemplates.filter(t => t.isPrimaryKey).map(t => t.name);
        pkNames.forEach(key => {
          if (props.item && props.item[key] !== undefined) {
            const indexKey = template.mappedBy ?? template.inversedBy;
            if (indexKey) {
              filter[indexKey] = props.item[key];
            }
          }
        });
      }

      const search = relationTableSearch.value[template.name] || '';
      const page = relationTablePage.value[template.name] || 1;
      const limit = relationTableItemsPerPage.value[template.name] || DEFAULT_PAGE_SIZE_SMALL;
      const sortBy = relationTableSortBy.value[template.name] || [];
      const columns: EntityTemplate[] = relationTableState.value[template.name]?.entityTemplates ?? [];
      const columnFilters = relationTableColumnFilters.value[template.name] || {};

      if (props.mode === 'edit' && props.item && template.referenceName) {
        const apiFilter = buildTableFilter({
          search,
          columnFilters,
          entityTemplates: columns,
          parentFilter: filter,
        });

        const result = await ApiGenericService.find<SaplingGenericItem>(template.referenceName, {
          filter: apiFilter,
          limit,
          page,
          orderBy: buildTableOrderBy(sortBy),
          relations: ['m:1'],
        });
        relationTableItems.value[template.name] = result.data;
        relationTableTotal.value[template.name] = result.meta?.total ?? result.data.length;
      } else {
        relationTableItems.value[template.name] = [];
        relationTableTotal.value[template.name] = 0;
      }
      relState.isLoading = false;
    }
  }

  function onRelationTablePage(name: string, val: number) {
    relationTablePage.value[name] = val;
    loadRelationTableItems();
  }

  function onRelationTableItemsPerPage(name: string, val: number) {
    relationTableItemsPerPage.value[name] = val;
    relationTablePage.value[name] = 1;
    loadRelationTableItems();
  }

  function onRelationTableSort(name: string, val: Array<{ key: string; order: 'asc' | 'desc' }>) {
    relationTableSortBy.value[name] = val;
    relationTablePage.value[name] = 1;
    loadRelationTableItems();
  }

  function onRelationTableColumnFilters(name: string, val: Record<string, ColumnFilterItem>) {
    relationTableColumnFilters.value[name] = { ...val };
    relationTablePage.value[name] = 1;
    loadRelationTableItems();
  }

  function onRelationTableReload(name: string) {
    // Just reload the items for this relation
    onRelationTablePage(name, relationTablePage.value[name] || 1);
  }

  async function fetchReferenceData(
    template: EntityTemplate,
    { search, page, pageSize }: { search: string; page: number; pageSize: number }
  ): Promise<{ items: Record<string, SaplingGenericItem>[]; total: number }> {
    const entityHandle = template.referenceName;
    let filter: Record<string, unknown> = {};
    const columns = getReferenceColumnsSync(template);
    if (search) {
      filter = {
        $or: columns.map(col => ({ [col.key]: { $like: `%${search}%` } }))
      };
    }
    const result = await ApiGenericService.find<SaplingGenericItem>(
      entityHandle ?? '', { filter, page, limit: pageSize}
    );
    return {
      items: result.data as Record<string, SaplingGenericItem>[],
      total: result.meta.total
    };
  }

  function getReferenceColumnsSync(template: EntityTemplate): EntityTemplate[] {
    const entityHandle = template.referenceName;
    return referenceColumnsMap.value[entityHandle ?? ''] ?? [];
  }

  async function ensureReferenceColumns(template: EntityTemplate): Promise<void> {
    const entityHandle = template.referenceName;
    if (!referenceColumnsMap.value[entityHandle ?? '']) {
      await genericStore.loadGeneric(entityHandle ?? '', 'global');
      const state = genericStore.getState(entityHandle ?? '');
      const templates = state.entityTemplates;
      referenceColumnsMap.value[entityHandle ?? ''] = templates
        .filter(t => !t.isAutoIncrement && !t.isReference && !t.options?.includes('isSecurity') && !t.options?.includes('isSystem'))
        .map(t => ({ ...t, key: t.name }));
    }
  }
  // #endregion

  function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatLocalTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  function applyCurrentUserDefaults(): void {
    if (props.mode !== 'create' || props.item || !currentPersonStore.person) {
      return;
    }

    templates.value
      .filter(template => template.isReference && template.options?.includes('isCurrentUser'))
      .forEach(template => {
        if (form.value[template.name] == null || form.value[template.name] === '') {
          form.value[template.name] = currentPersonStore.person;
        }
      });
  }

  // #region Form
  function initializeForm(): void {
    const now = new Date();
    form.value = {};
    templates.value.forEach(t => {
      if (t.isReference) {
        if (props.item) {
          const val = props.item[t.name];
          form.value[t.name] = (val && typeof val === 'object') ? val : null;
        } else if (t.options?.includes('isCurrentUser') && currentPersonStore.person) {
          form.value[t.name] = currentPersonStore.person;
        } else {
          form.value[t.name] = null;
        }
      } else if (t.type === 'datetime') {
        const dateField = props.item?.[t.name + '_date'];
        const timeField = props.item?.[t.name + '_time'];
        if (dateField !== undefined || timeField !== undefined) {
          form.value[t.name + '_date'] = typeof dateField === 'string' ? dateField : '';
          form.value[t.name + '_time'] = typeof timeField === 'string' ? timeField : '';
        } else {
          let dt = '';
          if (props.item && props.item[t.name]) {
            dt = String(props.item[t.name] ?? '');
          } else if (t.default) {
            dt = String(t.default ?? '');
          }
          if (dt) {
            const [date, time] = dt.split('T');
            form.value[t.name + '_date'] = date || '';
            form.value[t.name + '_time'] = (time || '').slice(0,5);
          } else if (!props.item && t.options?.includes('isToday')) {
            form.value[t.name + '_date'] = formatLocalDate(now);
            form.value[t.name + '_time'] = formatLocalTime(now);
          } else {
            form.value[t.name + '_date'] = '';
            form.value[t.name + '_time'] = '';
          }
        }
      } else {
        if (props.item) {
          form.value[t.name] = props.item[t.name] ?? t.default ?? '';
        } else if (t.default !== undefined && t.default !== null) {
          form.value[t.name] = t.default;
        } else if (t.type === 'DateType' && t.options?.includes('isToday')) {
          form.value[t.name] = formatLocalDate(now);
        } else if (t.type === 'time' && t.options?.includes('isToday')) {
          form.value[t.name] = formatLocalTime(now);
        } else {
          form.value[t.name] = t.type === 'boolean' ? false : '';
        }
      }
    });
  }

  const requiredRule = (label: string) => (v: unknown) =>
    v !== null && v !== undefined && v !== '' ? true : `${label} ${t('global.isRequired')}`;

  function getRules(template: EntityTemplate): Array<(v: unknown) => true | string> {
    const rules: Array<(v: unknown) => true | string> = [];
    if (template.isRequired) {
      rules.push(requiredRule(t(`${props.entity?.handle}.${template.name}`)));
    }
    return rules;
  }

  function onDialogUpdate(val: boolean): void {
    emit('update:modelValue', val);
  }
  // #endregion

  // #region Lifecycle
  onMounted(initialize);

  watch(() => [props.item, props.mode], async () => {
    await loadRelationTableItems();
  });

  watch(() => props.templates, async () => {
    await initialize();
  }, { deep: true });

  watch(() => [props.item, props.mode, props.templates], initializeForm, { immediate: true, deep: true });

  watch(() => currentPersonStore.person, applyCurrentUserDefaults, { deep: true });
  // #endregion

  // #region Permissions
  async function setEntitiesPermissions() {
    const currentPermissionStore = useCurrentPermissionStore(); // Access the current permission store
    await currentPermissionStore.fetchCurrentPermission(); // Fetch current permissions
    permissions.value = currentPermissionStore.accumulatedPermission; // Set the permissions
  }
  // #region

  // #region Save
  async function save(): Promise<void> {
    const result = await formRef.value?.validate();
    if (!result || !result.valid) return;

    const output = { ...form.value };

    if(props.mode === 'edit') {
      relationTemplates.value.forEach(t => delete output[t.name]);
    }

    // Dynamisch alle Datetime-Felder aus templates verarbeiten
    props.templates.filter(t => t.type === 'datetime').forEach((t) => {
      const key = t.name;
      const dateValue = output[`${key}_date`];
      let date = '';
      if (dateValue instanceof Date) {
        const d = new Date(dateValue);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
      } else if (typeof dateValue === 'string') {
        date = dateValue;
      }
      const time = output[`${key}_time`];

      if (date && time) {
        output[key] = `${date}T${time}`;
      } else if (date) {
        output[key] = date;
      }
      delete output[`${key}_date`];
      delete output[`${key}_time`];
    });
    
    // Anpassung für m:1-Relationen
    props.templates.filter(t => ['m:1'].includes(t.kind ?? '')).forEach(t => {
        const val = form.value[t.name];
        if (val && typeof val === 'object') {
          
          const valObj = val as { [key: string]: unknown };
          const pkValues = t.referencedPks?.map(pk => valObj[pk]).filter(v => v !== undefined && v !== null) ?? [];

          if (pkValues.length === 1) {
            output[t.name] = pkValues[0];
          } else if (pkValues.length > 1) {
            output[t.name] = pkValues;
          } else {
            output[t.name] = null;
          }
        } else {
          output[t.name] = val ?? null;
        }
    });

    if(props.mode === 'create') {
      props.templates.filter(t => ['m:n', 'n:m'].includes(t.kind ?? '')).forEach(t => {
        const val = form.value[t.name];
        if (Array.isArray(val) && t.referencedPks) {
          // Für jedes Element im Array eine Liste der referencedPks erstellen und flach zusammenführen
          const pkValuesList = val.map(item => {
            return t.referencedPks!.map(pk => item[pk]).filter(v => v !== undefined && v !== null);
          }).filter(arr => arr.length > 0);
          output[t.name] = pkValuesList.flat();
        } else {
          output[t.name] = val ?? null;
        }
      });
    }

    emit('update:modelValue', false);
    emit('save', output);
  }
  // #endregion

  // #region Cancel
  function cancel(): void {
    emit('update:modelValue', false);
    emit('cancel');
  }
  // #endregion

  // #region Return
  return {
    isLoading,
    form,
    formRef,
    activeTab,
    selectedRelations,
    visibleTemplates,
    relationTemplates,
    relationTableHeaders,
    relationTableState,
    relationTableItems,
    relationTableSearch,
    relationTablePage,
    relationTableTotal,
    relationTableItemsPerPage,
    relationTableSortBy,
    relationTableColumnFilters,
    permissions,
    getRules,
    getReferenceColumnsSync,
    fetchReferenceData,
    onDialogUpdate,
    cancel,
    save,
    addRelation,
    removeRelation,
    onRelationTablePage,
    onRelationTableItemsPerPage,
    onRelationTableSort,
    onRelationTableColumnFilters,
    onRelationTableReload,
  };
  // #endregion
}