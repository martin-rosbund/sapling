import { ref, watch, onMounted, computed, type Ref } from 'vue';
import type { EntityTemplate, FormType, AccumulatedPermission } from '@/entity/structure';
import { useGenericStore } from '@/stores/genericStore';
import ApiGenericService from '@/services/api.generic.service';
import { DEFAULT_PAGE_SIZE_MEDIUM, ENTITY_SYSTEM_COLUMNS } from '@/constants/project.constants';
import { useI18n } from 'vue-i18n';
import type { EntityItem } from '@/entity/entity';

export function useSaplingEdit(props: {
  modelValue: boolean;
  mode: 'create' | 'edit';
  item: FormType | null;
  entity: EntityItem | null;
  templates: EntityTemplate[];
  showReference?: boolean;
}, emit: (event: 'update:modelValue' | 'save' | 'cancel', ...args: unknown[]) => void) {
  const { t } = useI18n();
  const genericStore = useGenericStore();

  const templates = computed(() => props.templates ?? []);
  const showReference = props.showReference !== false;
  const isLoading = ref(true);
  const form: Ref<FormType> = ref({});
  type VuetifyFormRef = {
    validate: () => Promise<{ valid: boolean } | undefined>;
  };
  const formRef: Ref<VuetifyFormRef | null> = ref(null);
  const referenceColumnsMap: Ref<Record<string, EntityTemplate[]>> = ref({});
  const activeTab = ref(0);

  const visibleTemplates = computed(() =>
    templates.value.filter(x =>
      !x.isSystem &&
      !x.isAutoIncrement &&
      !['1:m', 'm:n', 'n:m'].includes(x.kind || '') &&
      (!x.isPrimaryKey || props.mode === 'create') &&
      (!x.isReference || showReference)
    )
  );

  const relationTemplates = computed(() =>
    templates.value.filter(x => ['1:m', 'm:n', 'n:m'].includes(x.kind || ''))
  );

  const selectedRelation = ref<Record<string, any>>({});
  const relationTableState = ref<Record<string, {
    templates: EntityTemplate[];
    entity: EntityItem | null;
    permission: AccumulatedPermission | null;
    loading: boolean;
  }>>({});
  const relationTableItems = ref<Record<string, unknown[]>>({});
  const relationTableSearch = ref<Record<string, string>>({});
  const relationTablePage = ref<Record<string, number>>({});
  const relationTableTotal = ref<Record<string, number>>({});
  const relationTableItemsPerPage = ref<Record<string, number>>({});

  const relationTableHeaders = computed(() => {
    const result: Record<string, any[]> = {};
    for (const key in relationTableState.value) {
      result[key] = (relationTableState.value[key]?.templates ?? [])
        .filter((x: any) => {
          const template = (relationTableState.value[key]?.templates ?? []).find((t: any) => t.name === x.name);
          return !ENTITY_SYSTEM_COLUMNS.includes(x.name) && !(template && template.isAutoIncrement);
        })
        .map((tpl: any) => ({
          ...tpl,
          key: tpl.name,
          title: t(`${(relationTableState.value[key]?.entity?.handle)}.${tpl.name}`),
        }));
    }
    return result;
  });

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

  function initializeForm(): void {
    form.value = {};
    templates.value.forEach(t => {
      if (t.isReference) {
        if (props.mode === 'edit' && props.item) {
          const val = props.item[t.name];
          form.value[t.name] = (val && typeof val === 'object') ? val : null;
        } else {
          form.value[t.name] = null;
        }
      } else if (['1:m', 'm:n', 'n:m'].includes(t.kind || '')) {
        // Relations are handled separately
      } else if (t.type === 'datetime') {
        let dt = '';
        if (props.mode === 'edit' && props.item && props.item[t.name]) {
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
      } else {
        if (props.mode === 'edit' && props.item) {
          form.value[t.name] = props.item[t.name] ?? t.default ?? '';
        } else {
          form.value[t.name] = t.default ?? (t.type === 'boolean' ? false : '');
        }
      }
    });
  }

  function getReferenceColumnsSync(template: EntityTemplate): EntityTemplate[] {
    const entityName = template.referenceName;
    return referenceColumnsMap.value[entityName] ?? [];
  }

  async function ensureReferenceColumns(template: EntityTemplate): Promise<void> {
    const entityName = template.referenceName;
    if (!referenceColumnsMap.value[entityName]) {
      await genericStore.loadGeneric(entityName, 'global');
      const state = genericStore.getState(entityName);
      const templates = state.entityTemplates;
      referenceColumnsMap.value[entityName] = templates
        .filter(t => !t.isSystem && t.isAutoIncrement === false && !t.isReference)
        .map(t => ({ ...t, key: t.name }));
    }
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
      entityName, { filter, page, limit: pageSize}
    );
    return {
      items: result.data as Record<string, unknown>[],
      total: result.meta.total
    };
  }

  async function loadRelationTableTemplates() {
    for (const template of relationTemplates.value) {
      if (!relationTableState.value[template.name]) {
        relationTableState.value[template.name] = { templates: [], entity: null, permission: null, loading: false };
      }

      await genericStore.loadGeneric(template.referenceName, 'global');
      const state = genericStore.getState(template.referenceName);
      if (relationTableState.value[template.name]) {
        relationTableState.value[template.name]!.templates = state.entityTemplates;
        relationTableState.value[template.name]!.entity = state.entity;
        relationTableState.value[template.name]!.permission = state.entityPermission;
      }
    }
  }

  async function loadRelationTableItems() {
    for (const template of relationTemplates.value) {
      const relState = relationTableState.value[template.name] ?? (relationTableState.value[template.name] = { templates: [], entity: null, permission: null, loading: false });
      relState.loading = true;
      
      const filter: Record<string, unknown> = {};
      if (props.item && template.mappedBy && props.item.handle) {
        filter[template.mappedBy] = props.item.handle;
      }

      const search = relationTableSearch.value[template.name] || '';
      const page = relationTablePage.value[template.name] || 1;
      const limit = relationTableItemsPerPage.value[template.name] || DEFAULT_PAGE_SIZE_MEDIUM;

      if (props.mode === 'edit' && props.item && template.referenceName) {
        let apiFilter = { ...filter };
        if (search) {
          const columns = relationTableState.value[template.name]?.templates ?? [];
          apiFilter = {
            ...apiFilter,
            $or: columns.map((col: any) => ({ [col.name]: { $like: `%${search}%` } }))
          };
        }
        const result = await ApiGenericService.find(template.referenceName, { filter: apiFilter, limit, page, relations: ['m:1'] });
        relationTableItems.value[template.name] = result.data;
        relationTableTotal.value[template.name] = result.meta?.total ?? result.data.length;
      } else {
        relationTableItems.value[template.name] = [];
        relationTableTotal.value[template.name] = 0;
      }
      relState.loading = false;
    }
  }

  async function addRelation(template: EntityTemplate) {
    const selected = selectedRelation.value[template.name];
    if (!selected || !props.item || !template || !template.mappedBy) return;

    selected[template.mappedBy] = props.item.handle;

    const pk: Record<string, string | number> = {};
    const refTemplates = relationTableState.value[template.name]?.templates ?? [];
    const pkNames = refTemplates.filter(t => t.isPrimaryKey).map(t => t.name);
    pkNames.forEach(key => {
      if (selected[key] !== undefined) pk[key] = selected[key];
    });

    try {
      await ApiGenericService.update(template.referenceName, pk, selected);
      selectedRelation.value[template.name] = null;
      await loadRelationTableItems();
    } catch (e) {
      console.error('Relation add failed', e); // TODO: Proper error handling
    }
  }

  async function removeRelation(template: EntityTemplate) {
    const selected = selectedRelation.value[template.name];
    if (!selected || !props.item || !template) return;

    const pk: Record<string, string | number> = {};
    const refTemplates = relationTableState.value[template.name]?.templates ?? [];
    const pkNames = refTemplates.filter(t => t.isPrimaryKey).map(t => t.name);
    pkNames.forEach(key => {
      if (selected[key] !== undefined) pk[key] = selected[key];
    });

    try {
      if (template.mappedBy) {
        selected[template.mappedBy] = null;
      }
      await ApiGenericService.update(template.referenceName, pk, selected);
      selectedRelation.value[template.name] = null;
      await loadRelationTableItems();
    } catch (e) {
      console.error('Relation remove failed', e); // TODO: Proper error handling
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

  function onDialogUpdate(val: boolean): void {
    emit('update:modelValue', val);
  }

  function cancel(): void {
    emit('update:modelValue', false);
    emit('cancel');
  }

  async function save(): Promise<void> {
    const result = await formRef.value?.validate();
    if (!result || !result.valid) return;

    const output = { ...form.value };
    relationTemplates.value.forEach(t => delete output[t.name]);

    emit('update:modelValue', false);
    emit('save', output);
  }

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

  onMounted(initialize);

  watch(() => [props.item, props.mode], async () => {
    await loadRelationTableItems();
  });

  watch(() => props.templates, async () => {
    await initialize();
  }, { deep: true });

  watch(() => [props.item, props.mode, props.templates], initializeForm, { immediate: true, deep: true });

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
  };
}
