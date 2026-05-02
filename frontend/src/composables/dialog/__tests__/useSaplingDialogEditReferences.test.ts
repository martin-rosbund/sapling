import { computed, reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AccumulatedPermission, EntityState, EntityTemplate } from '@/entity/structure'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'

const { loadGenericManyMock, loadGenericMock } = vi.hoisted(() => ({
  loadGenericManyMock: vi.fn(),
  loadGenericMock: vi.fn(),
}))

vi.mock('@/stores/genericStore', () => ({
  useGenericStore: () => ({
    getState: (key: string) => getMockedEntityState(key),
    loadGeneric: loadGenericMock,
    loadGenericMany: loadGenericManyMock,
  }),
}))

import { useSaplingDialogEditReferences } from '../useSaplingDialogEditReferences'

const entityStates = reactive<Record<string, EntityState>>({
  company: createEntityState('company', [
    createTemplate({
      name: 'name',
      type: 'string',
      options: ['isValue'],
    }),
    createTemplate({
      name: 'secret',
      type: 'string',
      options: ['isSecurity'],
    }),
  ]),
  person: createEntityState('person', [
    createTemplate({
      name: 'firstName',
      type: 'string',
    }),
    createTemplate({
      name: 'createdAt',
      type: 'datetime',
      options: ['isSystem'],
    }),
  ]),
})

describe('useSaplingDialogEditReferences', () => {
  beforeEach(() => {
    loadGenericManyMock.mockReset()
    loadGenericMock.mockReset()
    loadGenericManyMock.mockResolvedValue(undefined)
    loadGenericMock.mockResolvedValue(undefined)
  })

  it('loads readable reference metadata as one batch and exposes visible columns', async () => {
    const references = createReferences([
      { entityHandle: 'company', allowRead: true } as AccumulatedPermission,
      { entityHandle: 'person', allowRead: true } as AccumulatedPermission,
    ])
    const templates = [
      createTemplate({
        name: 'creatorCompany',
        type: 'CompanyItem',
        isReference: true,
        referenceName: 'company',
      }),
      createTemplate({
        name: 'assigneeCompany',
        type: 'CompanyItem',
        isReference: true,
        referenceName: 'company',
      }),
      createTemplate({
        name: 'creatorPerson',
        type: 'PersonItem',
        isReference: true,
        referenceName: 'person',
      }),
    ]

    await references.ensureReferenceColumnsForTemplates(templates)

    expect(loadGenericManyMock).toHaveBeenCalledTimes(1)
    expect(loadGenericManyMock).toHaveBeenCalledWith([
      { entityHandle: 'company', namespaces: ['global'] },
      { entityHandle: 'person', namespaces: ['global'] },
    ])
    expect(
      references.getReferenceColumnsSync(templates[0]).map((template) => template.name),
    ).toEqual(['name'])
    expect(
      references.getReferenceColumnsSync(templates[2]).map((template) => template.name),
    ).toEqual(['firstName'])
  })

  it('does not load unreadable reference metadata', async () => {
    const references = createReferences([
      { entityHandle: 'company', allowRead: false } as AccumulatedPermission,
    ])
    const template = createTemplate({
      name: 'company',
      type: 'CompanyItem',
      isReference: true,
      referenceName: 'company',
    })

    await references.ensureReferenceColumnsForTemplates([template])

    expect(loadGenericManyMock).not.toHaveBeenCalled()
    expect(references.getReferenceColumnsSync(template)).toEqual([])
  })
})

function createReferences(permissionsValue: AccumulatedPermission[]) {
  const form = ref<SaplingGenericItem>({})
  const templates = ref<EntityTemplate[]>([])
  const permissions = ref<AccumulatedPermission[] | null>(permissionsValue)

  return useSaplingDialogEditReferences({
    form,
    templates: computed(() => templates.value),
    permissions,
    hasFormValue: (value: unknown) => value !== null && value !== undefined && value !== '',
  })
}

function createEntityState(entityHandle: string, entityTemplates: EntityTemplate[]): EntityState {
  return {
    entity: { handle: entityHandle } as EntityItem,
    entityPermission: null,
    entityTranslation: {} as never,
    entityTemplates,
    isLoading: false,
    currentEntityName: entityHandle,
    currentNamespaces: [],
  }
}

function getMockedEntityState(key: string): EntityState {
  return entityStates[key] ?? createEntityState(key, [])
}

function createTemplate(
  overrides: Partial<EntityTemplate> & Pick<EntityTemplate, 'name' | 'type'>,
): EntityTemplate {
  return {
    name: overrides.name,
    key: overrides.name,
    title: overrides.name,
    type: overrides.type,
    kind: overrides.kind,
    referenceName: overrides.referenceName,
    options: overrides.options ?? [],
    isAutoIncrement: false,
    isPersistent: true,
    isReference: overrides.isReference ?? false,
    referencedPks: [],
    length: undefined,
  } as EntityTemplate
}
