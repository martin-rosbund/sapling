import { ref, watch, onMounted, computed, type Ref } from 'vue';
import type { EntityTemplate, FormType } from '@/entity/structure';
import { useTemplateLoader } from '@/composables/generic/useTemplateLoader';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityItem } from '@/entity/entity';

export function useEntityEditDialog(props: {
  modelValue: boolean;
  mode: 'create' | 'edit';
  item: FormType | null;
  entity: EntityItem | null;
  showReference?: boolean;
}, emit: (event: 'update:modelValue' | 'save' | 'cancel', ...args: any[]) => void) {
  const { templates, isLoading: isTemplateLoading, loadTemplates } = useTemplateLoader(props.entity?.handle ?? '', false);
  const showReference = props.showReference !== false;
  const isLoading = ref(true);
  const form: Ref<FormType> = ref({});
  type VuetifyFormRef = {
    validate: () => Promise<{ valid: boolean } | undefined>;
  };
  const formRef: Ref<VuetifyFormRef | null> = ref(null);
  const referenceColumnsMap: Ref<Record<string, EntityTemplate[]>> = ref({});

  const visibleTemplates = computed(() =>
    templates.value.filter(x =>
      !x.isSystem &&
      !x.isAutoIncrement &&
      !['1:m', 'm:n'].includes(x.kind || '') &&
      (!x.isPrimaryKey || props.mode === 'create') &&
      (!x.isReference || showReference)
    )
  );

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
    return referenceColumnsMap.value[entityName]?.map(col => ({
      key: col.key,
      name: col.name,
      type: col.type || 'string',
      length: col.length || 255,
      default: col.default || null,
      isPrimaryKey: col.isPrimaryKey || false,
      joinColumns: col.joinColumns || [],
      kind: col.kind || '',
      mappedBy: col.mappedBy || '',
      nullable: col.nullable !== undefined ? col.nullable : true,
      referenceName: col.referenceName || '',
      inversedBy: col.inversedBy || '',
      isRequired: col.isRequired || false,
      isAutoIncrement: col.isAutoIncrement || false,
      isSystem: col.isSystem || false,
      isReference: col.isReference || false,
    })) ?? [];
  }

  async function ensureReferenceColumns(template: EntityTemplate): Promise<EntityTemplate[] | undefined> {
    const entityName = template.referenceName;
    if (!referenceColumnsMap.value[entityName]) {
      const templates = await ApiService.findAll<{ name: string; isSystem?: boolean; isAutoIncrement?: boolean; isReference?: boolean }[]>(`template/${entityName}`);
      referenceColumnsMap.value[entityName] = templates
        .filter(t => !t.isSystem && t.isAutoIncrement === false && !t.isReference)
        .map(t => ({
          key: t.name,
          type: 'string',
          length: 255,
          default: null,
          isPrimaryKey: false,
          joinColumns: [],
          kind: '',
          mappedBy: '',
          nullable: true,
          referenceName: '',
          inversedBy: '',
          isRequired: false,
          isAutoIncrement: false,
          isSystem: false,
          isReference: false,
          ...t
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
      entityName, { filter, page, limit: pageSize }
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
    templates.value.forEach(t => {
      if (t.type === 'datetime') {
        const date = form.value[t.name + '_date'];
        const time = form.value[t.name + '_time'];
        output[t.name] = date && time ? `${date}T${time}` : '';
        delete output[t.name + '_date'];
        delete output[t.name + '_time'];
      }
    });
    emit('update:modelValue', false);
    emit('save', output);
  }

  onMounted(async () => {
    isLoading.value = true;
    for (const template of templates.value) {
      if (template.isReference) {
        await ensureReferenceColumns(template);
      }
    }
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
