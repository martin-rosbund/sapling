import { computed, defineComponent, nextTick, ref, type PropType } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AccumulatedPermission, DialogState, EntityTemplate } from '@/entity/structure'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'

const {
  fetchCurrentPersonMock,
  fetchCurrentPermissionMock,
  buildSavePayloadMock,
  listFormConfigsMock,
  findAllMock,
  initializeFormMock,
} = vi.hoisted(() => ({
  fetchCurrentPersonMock: vi.fn(),
  fetchCurrentPermissionMock: vi.fn(),
  buildSavePayloadMock: vi.fn(),
  listFormConfigsMock: vi.fn(),
  findAllMock: vi.fn(),
  initializeFormMock: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    te: () => false,
  }),
}))

vi.mock('@/services/api.generic.service', () => ({
  default: {
    find: vi.fn(),
  },
}))

vi.mock('@/services/api.form-config.service', () => ({
  default: {
    list: listFormConfigsMock,
  },
}))

vi.mock('@/services/api.service', () => ({
  default: {
    findAll: findAllMock,
  },
}))

vi.mock('@/constants/mdi.icons', () => ({
  mdiIcons: [],
}))

vi.mock('@/utils/saplingTableUtil', () => ({
  getEditDialogHeaders: (templates: EntityTemplate[]) => templates,
}))

vi.mock('@/utils/saplingDialogLayoutUtil', () => ({
  getDialogTemplateColumns: () => ({ cols: 12 }),
  groupDialogTemplates: (templates: EntityTemplate[]) => [{ id: 'main', label: '', templates }],
  sortDialogTemplates: (templates: EntityTemplate[]) => templates,
}))

vi.mock('@/stores/currentPermissionStore', () => ({
  useCurrentPermissionStore: () => ({
    accumulatedPermission: [] as AccumulatedPermission[],
    fetchCurrentPermission: fetchCurrentPermissionMock,
  }),
}))

vi.mock('@/stores/currentPersonStore', () => ({
  useCurrentPersonStore: () => ({
    person: null,
    fetchCurrentPerson: fetchCurrentPersonMock,
  }),
}))

vi.mock('../useSaplingDialogEditRelations', () => ({
  useSaplingDialogEditRelations: () => ({
    relationTemplates: computed(() => []),
    relationTableHeaders: ref({}),
    relationTableState: ref({}),
    relationTableItems: ref({}),
    relationTableSearch: ref({}),
    relationTablePage: ref({}),
    relationTableTotal: ref({}),
    relationTableItemsPerPage: ref({}),
    relationTableSortBy: ref({}),
    relationTableColumnFilters: ref({}),
    selectedRelations: ref({}),
    selectedItems: ref([]),
    addRelation: vi.fn(),
    removeRelation: vi.fn(),
    initializeRelationTables: vi.fn().mockResolvedValue(undefined),
    ensureRelationTableItems: vi.fn().mockResolvedValue(undefined),
    onRelationTablePage: vi.fn(),
    onRelationTableItemsPerPage: vi.fn(),
    onRelationTableSort: vi.fn(),
    onRelationTableColumnFilters: vi.fn(),
    onRelationTableReload: vi.fn(),
    clearSelectedItems: vi.fn(),
    resetRelationTableItems: vi.fn(),
    resetRelationSelections: vi.fn(),
  }),
}))

vi.mock('../useSaplingDialogEditReferences', () => ({
  useSaplingDialogEditReferences: () => ({
    extractDependencyIdentifier: vi.fn().mockReturnValue(null),
    getReferenceParentFilter: vi.fn(),
    isReferenceDependencyBlocked: vi.fn().mockReturnValue(false),
    isReferenceValueValidForDependency: vi.fn().mockReturnValue(true),
    getReferenceColumnsSync: vi.fn().mockReturnValue([]),
    canReadReferenceEntity: vi.fn().mockReturnValue(true),
    prefetchReferenceColumns: vi.fn().mockResolvedValue(undefined),
    fetchReferenceData: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('../useSaplingDialogEditDirty', () => ({
  useSaplingDialogEditDirty: () => ({
    syncInitialFormSnapshot: vi.fn(),
    isDirty: computed(() => true),
    dirtyFieldCount: computed(() => 1),
    isTemplateDirty: vi.fn().mockReturnValue(true),
    getDirtyTemplateCount: vi.fn().mockReturnValue(1),
  }),
}))

vi.mock('../useSaplingDialogEditForm', () => ({
  useSaplingDialogEditForm: (options: { item: { value: SaplingGenericItem | null } }) => ({
    applyCurrentDefaults: vi.fn(),
    initializeForm: () => initializeFormMock(options.item.value),
    syncParentReferences: vi.fn(),
    buildSavePayload: buildSavePayloadMock,
  }),
}))

import { useSaplingDialogEdit } from '../useSaplingDialogEdit'

const TestHost = defineComponent({
  props: {
    modelValue: {
      type: Boolean,
      default: true,
    },
    templates: {
      type: Array as PropType<EntityTemplate[]>,
      default: () => [{ name: 'title', type: 'string' }],
    },
    item: {
      type: Object as PropType<SaplingGenericItem | null>,
      default: () => ({ handle: 42, title: 'Calendar event' }),
    },
  },
  emits: ['update:modelValue', 'save', 'cancel', 'update:mode', 'update:item'],
  setup(props, { emit }) {
    const dialogEmit = ((
      event: 'update:modelValue' | 'save' | 'cancel' | 'update:mode' | 'update:item',
      ...args: unknown[]
    ) => emit(event, ...(args as []))) as Parameters<typeof useSaplingDialogEdit>[1]

    const dialog = useSaplingDialogEdit(
      {
        get modelValue() {
          return props.modelValue
        },
        mode: 'edit' as DialogState,
        get item() {
          return props.item
        },
        entity: { handle: 'event' } as EntityItem,
        get templates() {
          return props.templates
        },
      },
      dialogEmit,
    )

    dialog.formRef.value = {
      validate: async () => ({ valid: true }),
    }

    return {
      cancel: dialog.cancel,
      discardChanges: dialog.discardChanges,
      keepEditing: dialog.keepEditing,
      saveAndClose: dialog.saveAndClose,
      unsavedChangesDialog: dialog.unsavedChangesDialog,
      formConfigMenuItems: dialog.formConfigMenuItems,
      selectedFormConfigLabel: dialog.selectedFormConfigLabel,
      visibleTemplates: dialog.visibleTemplates,
      selectFormConfig: dialog.selectFormConfig,
    }
  },
  template: '<div />',
})

describe('useSaplingDialogEdit', () => {
  beforeEach(() => {
    fetchCurrentPersonMock.mockReset()
    fetchCurrentPermissionMock.mockReset()
    buildSavePayloadMock.mockReset()
    listFormConfigsMock.mockReset()
    findAllMock.mockReset()
    initializeFormMock.mockReset()
    fetchCurrentPersonMock.mockResolvedValue(undefined)
    fetchCurrentPermissionMock.mockResolvedValue(undefined)
    listFormConfigsMock.mockResolvedValue([])
    findAllMock.mockResolvedValue([{ name: 'title', type: 'string' }])
    buildSavePayloadMock.mockReturnValue({
      handle: 42,
      title: 'Updated event',
    })
  })

  it('emits saveAndClose without closing the dialog before the save handler runs', async () => {
    const wrapper = mount(TestHost)

    await (wrapper.vm as { saveAndClose: () => Promise<void> }).saveAndClose()

    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('save')?.[0]?.[1]).toBe('saveAndClose')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('asks for confirmation before cancelling a dirty dialog', async () => {
    const wrapper = mount(TestHost)
    const vm = wrapper.vm as { cancel: () => void; unsavedChangesDialog: boolean }

    vm.cancel()

    expect(vm.unsavedChangesDialog).toBe(true)
    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps editing when the unsaved changes prompt is cancelled', async () => {
    const wrapper = mount(TestHost)
    const vm = wrapper.vm as {
      cancel: () => void
      keepEditing: () => void
      unsavedChangesDialog: boolean
    }

    vm.cancel()
    vm.keepEditing()

    expect(vm.unsavedChangesDialog).toBe(false)
    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('closes the dialog when dirty changes are discarded', async () => {
    const wrapper = mount(TestHost)
    const vm = wrapper.vm as {
      cancel: () => void
      discardChanges: () => void
      unsavedChangesDialog: boolean
    }

    vm.cancel()
    vm.discardChanges()

    expect(vm.unsavedChangesDialog).toBe(false)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('selects the active default form configuration automatically', async () => {
    listFormConfigsMock.mockResolvedValue([
      {
        handle: 3,
        name: 'Team view',
        entity: 'event',
        scope: 'global',
        isActive: true,
        isDefault: false,
        version: 1,
        config: {
          schema: 'sapling.form-config.v1',
          entityHandle: 'event',
          fields: {
            title: {
              label: 'Team title',
            },
          },
        },
      },
      {
        handle: 7,
        name: 'Default view',
        entity: 'event',
        scope: 'global',
        isActive: true,
        isDefault: true,
        version: 1,
        config: {
          schema: 'sapling.form-config.v1',
          entityHandle: 'event',
          fields: {
            title: {
              label: 'Default title',
            },
          },
        },
      },
    ])

    const wrapper = mount(TestHost, { props: { modelValue: true } })
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      formConfigMenuItems: Array<{ handle: number | null; active: boolean }>
      selectedFormConfigLabel: string
      visibleTemplates: EntityTemplate[]
      selectFormConfig: (handle: number | null) => void
    }

    expect(vm.selectedFormConfigLabel).toBe('Default view')
    expect(vm.formConfigMenuItems.find((item) => item.handle === 7)?.active).toBe(true)
    expect(vm.visibleTemplates[0]?.formConfig?.label).toBe('Default title')

    vm.selectFormConfig(null)
    await nextTick()

    expect(vm.selectedFormConfigLabel).toBe('')
    expect(vm.formConfigMenuItems.find((item) => item.handle === null)?.active).toBe(true)

    await wrapper.setProps({ modelValue: false })
    await nextTick()
    await wrapper.setProps({ modelValue: true })
    await nextTick()

    expect(vm.selectedFormConfigLabel).toBe('Default view')
    expect(vm.formConfigMenuItems.find((item) => item.handle === 7)?.active).toBe(true)
  })

  it('falls back to the entity standard view when no default form configuration exists', async () => {
    listFormConfigsMock.mockResolvedValue([
      {
        handle: 3,
        name: 'Team view',
        entity: 'event',
        scope: 'global',
        isActive: true,
        isDefault: false,
        version: 1,
        config: {
          schema: 'sapling.form-config.v1',
          entityHandle: 'event',
          fields: {
            title: {
              label: 'Team title',
            },
          },
        },
      },
    ])

    const wrapper = mount(TestHost, { props: { modelValue: true } })
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      formConfigMenuItems: Array<{ handle: number | null; active: boolean }>
      selectedFormConfigLabel: string
      visibleTemplates: EntityTemplate[]
    }

    expect(vm.selectedFormConfigLabel).toBe('')
    expect(vm.formConfigMenuItems.find((item) => item.handle === null)?.active).toBe(true)
    expect(vm.visibleTemplates[0]?.formConfig?.label).toBeUndefined()
  })

  it('uses the raw entity template for standard view even when the default config is selected automatically', async () => {
    findAllMock.mockResolvedValue([
      {
        name: 'title',
        type: 'string',
        formGroup: 'Entity group',
        formOrder: 1,
        formWidth: 4,
      },
    ])
    listFormConfigsMock.mockResolvedValue([
      {
        handle: 7,
        name: 'Default view',
        entity: 'event',
        scope: 'global',
        isActive: true,
        isDefault: true,
        version: 1,
        config: {
          schema: 'sapling.form-config.v1',
          entityHandle: 'event',
          fields: {
            title: {
              label: 'Default title',
              group: 'Default group',
              order: 9,
              width: 1,
            },
          },
        },
      },
    ])

    const wrapper = mount(TestHost, {
      props: {
        modelValue: true,
        templates: [
          {
            name: 'title',
            type: 'string',
            formGroup: 'Default group',
            formOrder: 9,
            formWidth: 1,
            formConfig: {
              label: 'Default title',
              group: 'Default group',
              order: 9,
              width: 1,
            },
          },
        ] as EntityTemplate[],
      },
    })
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      selectedFormConfigLabel: string
      visibleTemplates: EntityTemplate[]
      selectFormConfig: (handle: number | null) => void
    }

    expect(vm.selectedFormConfigLabel).toBe('Default view')
    expect(vm.visibleTemplates[0]?.formConfig?.label).toBe('Default title')
    expect(vm.visibleTemplates[0]?.formGroup).toBe('Default group')

    vm.selectFormConfig(null)
    await nextTick()

    expect(vm.selectedFormConfigLabel).toBe('')
    expect(vm.visibleTemplates[0]?.formConfig?.label).toBeUndefined()
    expect(vm.visibleTemplates[0]?.formGroup).toBe('Entity group')
    expect(vm.visibleTemplates[0]?.formOrder).toBe(1)
    expect(vm.visibleTemplates[0]?.formWidth).toBe(4)
  })

  it('hydrates the form from the current item every time the dialog opens', async () => {
    const firstItem = { handle: 42, title: 'Old title' }
    const currentItem = { handle: 42, title: 'Merged title' }
    const wrapper = mount(TestHost, {
      props: {
        modelValue: false,
        item: firstItem,
      },
    })
    await flushPromises()
    initializeFormMock.mockClear()

    await wrapper.setProps({
      item: currentItem,
      modelValue: true,
    })
    await nextTick()

    expect(initializeFormMock).toHaveBeenCalled()
    expect(initializeFormMock.mock.calls[initializeFormMock.mock.calls.length - 1]?.[0]).toEqual(
      currentItem,
    )
  })
})
