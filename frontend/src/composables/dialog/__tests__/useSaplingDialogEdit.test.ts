import { computed, defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AccumulatedPermission, DialogState, EntityTemplate } from '@/entity/structure'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'

const { fetchCurrentPersonMock, fetchCurrentPermissionMock, buildSavePayloadMock } = vi.hoisted(
  () => ({
    fetchCurrentPersonMock: vi.fn(),
    fetchCurrentPermissionMock: vi.fn(),
    buildSavePayloadMock: vi.fn(),
  }),
)

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
  useSaplingDialogEditForm: () => ({
    applyCurrentDefaults: vi.fn(),
    initializeForm: vi.fn(),
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
  },
  emits: ['update:modelValue', 'save', 'cancel', 'update:mode', 'update:item'],
  setup(props, { emit }) {
    const dialogEmit = ((
      event: 'update:modelValue' | 'save' | 'cancel' | 'update:mode' | 'update:item',
      ...args: unknown[]
    ) => emit(event, ...(args as []))) as Parameters<typeof useSaplingDialogEdit>[1]

    const dialog = useSaplingDialogEdit(
      {
        modelValue: props.modelValue,
        mode: 'edit' as DialogState,
        item: { handle: 42, title: 'Calendar event' } as SaplingGenericItem,
        entity: { handle: 'event' } as EntityItem,
        templates: [{ name: 'title', type: 'string' } as EntityTemplate],
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
    }
  },
  template: '<div />',
})

describe('useSaplingDialogEdit', () => {
  beforeEach(() => {
    fetchCurrentPersonMock.mockReset()
    fetchCurrentPermissionMock.mockReset()
    buildSavePayloadMock.mockReset()
    fetchCurrentPersonMock.mockResolvedValue(undefined)
    fetchCurrentPermissionMock.mockResolvedValue(undefined)
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
})
