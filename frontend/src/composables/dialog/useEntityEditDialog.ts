import { ref, watch, onMounted, computed, type Ref } from 'vue';
import type { EntityTemplate, FormType } from '@/entity/structure';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityItem } from '@/entity/entity';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';

export function useEntityEditDialog(props: {
  modelValue: boolean;
  mode: 'create' | 'edit';
  item: FormType | null;
  entity: EntityItem | null;
  templates?: EntityTemplate[];
  showReference?: boolean;
}, emit: (event: 'update:modelValue' | 'save' | 'cancel', ...args: unknown[]) => void) {
  // Templates werden jetzt direkt aus den Props verwendet
  const templates = computed(() => props.templates ?? []);
  const isTemplateLoading = ref(false);
  const showReference = props.showReference !== false;
  const isLoading = ref(true);
  const form: Ref<FormType> = ref({});
  type VuetifyFormRef = {
    validate: () => Promise<{ valid: boolean } | undefined>;
  };
  const formRef: Ref<VuetifyFormRef | null> = ref(null);
  const referenceColumnsMap: Ref<Record<string, EntityTemplate[]>> = ref({});

  // Templates for direct editing (exclude 1:m, m:n, n:m)
  const visibleTemplates = computed(() =>
    templates.value.filter(x =>
      !x.isSystem &&
      !x.isAutoIncrement &&
      !['1:m', 'm:n', 'n:m'].includes(x.kind || '') &&
      (!x.isPrimaryKey || props.mode === 'create') &&
      (!x.isReference || showReference)
    )
  );

  // Templates for relation tables (1:m, m:n, n:m)
  const relationTemplates = computed(() =>
    templates.value.filter(x => ['1:m', 'm:n', 'n:m'].includes(x.kind || ''))
  );

  // State for related entities (per relation template)
  const relationEntities = ref<Record<string, unknown[]>>({});
  const relationLoading = ref<Record<string, boolean>>({});

  // Load related entities for each relation template
  async function loadRelationEntities() {
    for (const t of relationTemplates.value) {
      relationLoading.value[t.name] = true;
      try {
        // Use ApiGenericService to fetch related items for this relation
        // For 1:m, filter by mappedBy (FK in child = PK in parent)
        // For m:n/n:m, use join table or mappedBy/inversedBy as available
        const filter: Record<string, unknown> = {};
        if (props.item && t.mappedBy && props.item.handle) {
          filter[t.mappedBy] = props.item.handle;
        }
        // For create mode, no related items yet
        if (props.mode === 'edit' && props.item && t.referenceName) {
          const result = await ApiGenericService.find(t.referenceName, { filter, limit: DEFAULT_PAGE_SIZE_MEDIUM, page: 1, relations: ['m:1'] });
          relationEntities.value[t.name] = result.data;
        } else {
          relationEntities.value[t.name] = [];
        }
      } catch {
        relationEntities.value[t.name] = [];
      }
      relationLoading.value[t.name] = false;
    }
  }

  // Add/remove/edit for related entities
  function addRelationEntity(relationName: string, entity: unknown) {
    if (!relationEntities.value[relationName]) relationEntities.value[relationName] = [];
    relationEntities.value[relationName].push(entity);
  }
  function removeRelationEntity(relationName: string, idx: number) {
    if (relationEntities.value[relationName]) relationEntities.value[relationName].splice(idx, 1);
  }
  function updateRelationEntity(relationName: string, idx: number, entity: unknown) {
    if (relationEntities.value[relationName]) relationEntities.value[relationName][idx] = entity;
  }

  function getReferenceModelValue(val: unknown): Record<string, unknown> | null {
    return (val !== undefined && typeof val === 'object' && val !== null) ? val as Record<string, unknown> : null;
  }

  const requiredRule = (label: string) => (v: unknown) =>
    v !== null && v !== undefined && v !== '' ? true : `${label} ${i18n.global.t('global.isRequired')}`;

  function getRules(template: EntityTemplate): Array<(v: unknown) => true | string> {
    const rules: Array<(v: unknown) => true | string> = [];
    if (template.isRequired) {
      rules.push(requiredRule(i18n.global.t(`${props.entity?.handle}.${template.name}`)));
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
        // Relations handled in relationEntities, not in form
        // (optional: could prefill from props.item if needed)
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
    // Load relation entities for edit mode
    if (props.mode === 'edit') {
      loadRelationEntities();
    } else {
      // For create mode, start with empty arrays
      relationTemplates.value.forEach(t => { relationEntities.value[t.name] = []; });
    }
  }

  function getReferenceColumnsSync(template: EntityTemplate): EntityTemplate[] {
    const entityName = template.referenceName;
    return referenceColumnsMap.value[entityName] ?? [];
  }

  async function ensureReferenceColumns(template: EntityTemplate): Promise<EntityTemplate[] | undefined> {
    const entityName = template.referenceName;
    if (!referenceColumnsMap.value[entityName]) {
      const templates = await ApiService.findAll<EntityTemplate[]>(`template/${entityName}`);
      referenceColumnsMap.value[entityName] = templates
        .filter(t => !t.isSystem && t.isAutoIncrement === false && !t.isReference)
        .map(t => ({
          ...t,
          key: t.name
        }));
    }
    return referenceColumnsMap.value[entityName];
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

  function onDialogUpdate(val: boolean): void {
    emit('update:modelValue', val);
  }

  function cancel(): void {
    emit('update:modelValue', false);
    emit('cancel');
  }

  async function save(): Promise<void> {
    const result = await formRef.value?.validate();
    if (!result || result.valid === false) return;
    const output = { ...form.value };
    // Remove relation fields from output, but add relationEntities as separate property
    relationTemplates.value.forEach(t => {
      delete output[t.name];
    });
    // Add relationEntities to output for parent to handle
    emit('update:modelValue', false);
    emit('save', { ...output, _relations: { ...relationEntities.value } });
  }

  onMounted(async () => {
    isLoading.value = true;
    for (const template of templates.value) {
      if (template.isReference) {
        await ensureReferenceColumns(template);
      }
    }
    await loadRelationEntities();
    isLoading.value = false;
  });

  watch(
    () => templates.value,
    async (newTemplates) => {
      for (const template of newTemplates) {
        if (template.isReference) {
          await ensureReferenceColumns(template);
        }
      }
      await loadRelationEntities();
    },
    { immediate: false }
  );

  watch(() => [props.item, props.mode, templates.value], initializeForm, { immediate: true });

  return {
    showReference,
    isLoading,
    isTemplateLoading,
    form,
    formRef,
    referenceColumnsMap,
    visibleTemplates,
    relationTemplates,
    relationEntities,
    relationLoading,
    addRelationEntity,
    removeRelationEntity,
    updateRelationEntity,
    getReferenceModelValue,
    getRules,
    initializeForm,
    getReferenceColumnsSync,
    ensureReferenceColumns,
    fetchReferenceData,
    onDialogUpdate,
    cancel,
    save,
  };
}
