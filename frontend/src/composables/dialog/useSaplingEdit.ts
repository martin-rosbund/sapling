// #region Imports
import { ref, watch, onMounted, computed, type Ref } from 'vue';
import type { EntityState, EntityTemplate, FormType } from '@/entity/structure';
import { useGenericStore } from '@/stores/genericStore';
import ApiGenericService from '@/services/api.generic.service';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
import { useI18n } from 'vue-i18n';
import type { EntityItem } from '@/entity/entity';
import { getRelationTableHeaders } from '@/utils/saplingTableUtil';
// #endregion

export function useSaplingEdit(props: {
  modelValue: boolean;
  mode: 'create' | 'edit';
  item: FormType | null;
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
  const form: Ref<FormType> = ref({});
  const formRef: Ref<VuetifyFormRef | null> = ref(null);
  const referenceColumnsMap: Ref<Record<string, EntityTemplate[]>> = ref({});
  const activeTab = ref(0);
  const relationTableItems = ref<Record<string, unknown[]>>({});
  const relationTableSearch = ref<Record<string, string>>({});
  const relationTablePage = ref<Record<string, number>>({});
  const relationTableTotal = ref<Record<string, number>>({});
  const relationTableItemsPerPage = ref<Record<string, number>>({});
  const relationTableSortBy = ref<Record<string, Array<{ key: string; order: 'asc' | 'desc' }>>>({});
  const selectedRelation = ref<Record<string, any>>({});
  const relationTableState = ref<Record<string, EntityState>>({});
  // #endregion

  // #region Templates 
  const visibleTemplates = computed(() =>
    templates.value.filter(x =>
      !x.isSystem &&
      !x.isAutoIncrement &&
      !['1:m', 'm:n', 'n:m'].includes(x.kind || '') &&
      (!x.isPrimaryKey || props.mode === 'create') &&
      (!x.isReference || showReference)
    )
  );

  const relationTemplates = computed(() => {
    if(!showReference) {
      return [];
    }
    return templates.value.filter(x => ['1:m', 'm:n', 'n:m'].includes(x.kind || ''))
  });
  // #endregion
  
  // #region Reference
  async function addRelation(template: EntityTemplate) {
    switch(template.kind) {
      case '1:m':
        addRelation1M(template);
        break;
      default:
        addRelationNM(template);
        break;
    }
  }

  async function removeRelation(template: EntityTemplate) {
    switch(template.kind) {
      case '1:m':
        removeRelation1M(template);
        break;
      default:
        removeRelationNM(template);
        break;
    }
  }
  // #endregion 

  // #region Reference n:m m:n 
  const relationTableHeaders = computed(() =>
    getRelationTableHeaders(relationTableState.value, t)
  );

  async function addRelationNM(template: EntityTemplate){
    const entityName = props.entity?.handle ?? '';
    const entityTemplate = props.templates ?? [];
    const entityItem = props.item;
    const entityPrimaryKey: Record<string, string | number> = {};

    const referenceName = template.referenceName ?? '';
    const referenceTemplate = relationTableState.value[template.name]?.entityTemplates ?? [];
    const referenceItem = selectedRelation.value[template.name];
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

    await ApiGenericService.createReference(entityName, referenceName, entityPrimaryKey, referencePrimaryKey);
    selectedRelation.value[template.name] = null;
    await loadRelationTableItems();
  }

  async function removeRelationNM(template: EntityTemplate) {
    const entityName = props.entity?.handle ?? '';
    const entityTemplate = props.templates ?? [];
    const entityItem = props.item;
    const entityPrimaryKey: Record<string, string | number> = {};

    const referenceName = template.referenceName ?? '';
    const referenceTemplate = relationTableState.value[template.name]?.entityTemplates ?? [];
    const referenceItem = selectedRelation.value[template.name];
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

    await ApiGenericService.deleteReference(entityName, referenceName, entityPrimaryKey, referencePrimaryKey);
    selectedRelation.value[template.name] = null;
    await loadRelationTableItems();
  }
  // #endregion

  // #region Reference 1:m
  async function addRelation1M(template: EntityTemplate){
    const selected = selectedRelation.value[template.name];
    const pk: Record<string, string | number> = {};
    const mappedBy = template.mappedBy;

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
    selectedRelation.value[template.name] = null;
    await loadRelationTableItems();
  } 

  async function removeRelation1M(template: EntityTemplate) {
    const selected = selectedRelation.value[template.name];
    const mappedBy = template.mappedBy;
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
    selectedRelation.value[template.name] = null;
    await loadRelationTableItems();
  }
  // #endregion

  // #region Reference Dropdown
  async function initialize() {
    isLoading.value = true;
    const referencePromises = templates.value
      .filter(t => t.isReference)
      .map(ensureReferenceColumns);
    await Promise.all(referencePromises);
    await loadRelationTableTemplates();

    for (const template of relationTemplates.value) {
      relationTableSearch.value[template.name] = '';
      relationTablePage.value[template.name] = 1;
      relationTableTotal.value[template.name] = 0;
      relationTableItemsPerPage.value[template.name] = DEFAULT_PAGE_SIZE_MEDIUM;
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
      const limit = relationTableItemsPerPage.value[template.name] || DEFAULT_PAGE_SIZE_MEDIUM;
      const sortBy = relationTableSortBy.value[template.name] || [];

      if (props.mode === 'edit' && props.item && template.referenceName) {
        let apiFilter = { ...filter };
        if (search) {
          const columns: EntityTemplate[] = relationTableState.value[template.name]?.entityTemplates ?? [];
          apiFilter = {
            ...apiFilter,
            $or: columns.map((col) => ({ [col.name]: { $like: `%${search}%` } }))
          };
        }

        // Build orderBy from sortBy
        const orderBy: Record<string, string> = {};
        sortBy.forEach(sort => {
          orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
        });

        const result = await ApiGenericService.find(template.referenceName, { filter: apiFilter, limit, page, orderBy, relations: ['m:1'] });
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

  async function fetchReferenceData(
    template: EntityTemplate,
    { search, page, pageSize }: { search: string; page: number; pageSize: number }
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    const entityName = template.referenceName;
    let filter: Record<string, unknown> = {};
    const columns = getReferenceColumnsSync(template);
    if (search) {
      filter = {
        $or: columns.map(col => ({ [col.key]: { $like: `%${search}%` } }))
      };
    }
    const result = await ApiGenericService.find<unknown>(
      entityName ?? '', { filter, page, limit: pageSize}
    );
    return {
      items: result.data as Record<string, unknown>[],
      total: result.meta.total
    };
  }

  function getReferenceColumnsSync(template: EntityTemplate): EntityTemplate[] {
    const entityName = template.referenceName;
    return referenceColumnsMap.value[entityName ?? ''] ?? [];
  }

  async function ensureReferenceColumns(template: EntityTemplate): Promise<void> {
    const entityName = template.referenceName;
    if (!referenceColumnsMap.value[entityName ?? '']) {
      await genericStore.loadGeneric(entityName ?? '', 'global');
      const state = genericStore.getState(entityName ?? '');
      const templates = state.entityTemplates;
      referenceColumnsMap.value[entityName ?? ''] = templates
        .filter(t => !t.isSystem && !t.isAutoIncrement && !t.isReference && !t.isSecurity)
        .map(t => ({ ...t, key: t.name }));
    }
  }
  // #endregion

  // #region Form
  function initializeForm(): void {
    form.value = {};
    templates.value.forEach(t => {
      if (t.isReference) {
        if (props.item) {
          const val = props.item[t.name];
          form.value[t.name] = (val && typeof val === 'object') ? val : null;
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
          } else {
            form.value[t.name + '_date'] = '';
            form.value[t.name + '_time'] = '';
          }
        }
      } else {
        if (props.item) {
          form.value[t.name] = props.item[t.name] ?? t.default ?? '';
        } else {
          form.value[t.name] = t.default ?? (t.type === 'boolean' ? false : '');
        }
      }
    });
  }

  function getReferenceModelValue(val: unknown): Record<string, unknown> | null {
    return (val !== undefined && typeof val === 'object' && val !== null) ? val as Record<string, unknown> : null;
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
  // #endregion

  // #region Save
  async function save(): Promise<void> {
    const result = await formRef.value?.validate();
    if (!result || !result.valid) return;

    const output = { ...form.value };
    relationTemplates.value.forEach(t => delete output[t.name]);

    // Anpassung für m:1-Relationen
    props.templates.filter(t => t.kind === 'm:1').forEach(t => {
        const val = form.value[t.name];
        if (val && typeof val === 'object') {
          // referencedPks: Array mit PK-Namen
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
    selectedRelation,
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
    getReferenceModelValue,
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
  };
  // #endregion
}