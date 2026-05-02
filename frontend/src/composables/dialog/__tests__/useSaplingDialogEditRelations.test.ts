import { computed, ref, reactive } from 'vue'
import { describe, expect, it, beforeEach, vi } from 'vitest'

import type {
  AccumulatedPermission,
  DialogState,
  EntityState,
  EntityTemplate,
} from '@/entity/structure'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'

const { apiFindMock, loadGenericManyMock } = vi.hoisted(() => ({
  apiFindMock: vi.fn(),
  loadGenericManyMock: vi.fn(),
}))

vi.mock('@/services/api.generic.service', () => ({
  default: {
    find: apiFindMock,
  },
}))

vi.mock('@/stores/genericStore', () => ({
  useGenericStore: () => ({
    getState: (key: string) => getMockedEntityState(key),
    loadGenericMany: loadGenericManyMock,
  }),
}))

import { useSaplingDialogEditRelations } from '../useSaplingDialogEditRelations'

const entityStates = reactive<Record<string, EntityState>>({
  note: createEntityState('note', [
    createTemplate({
      name: 'title',
      type: 'string',
    }),
  ]),
  event: createEntityState('event', [
    createTemplate({
      name: 'subject',
      type: 'string',
    }),
  ]),
})

describe('useSaplingDialogEditRelations', () => {
  beforeEach(() => {
    apiFindMock.mockReset()
    loadGenericManyMock.mockReset()
    loadGenericManyMock.mockResolvedValue(undefined)
    apiFindMock.mockResolvedValue({
      data: [{ handle: 1, title: 'First note' }],
      meta: { total: 1 },
    })
  })

  it('initializes relation metadata without loading relation table rows', async () => {
    const relations = createRelations()

    await relations.initializeRelationTables()

    expect(loadGenericManyMock).toHaveBeenCalledWith([
      { entityHandle: 'note', namespaces: ['global'] },
      { entityHandle: 'event', namespaces: ['global'] },
    ])
    expect(apiFindMock).not.toHaveBeenCalled()
    expect(relations.relationTableItems.value.notes).toEqual([])
    expect(relations.relationTableTotal.value.notes).toBe(0)
  })

  it('loads a relation table once when that tab is requested', async () => {
    const relations = createRelations()
    await relations.initializeRelationTables()

    await relations.ensureRelationTableItems('notes')
    await relations.ensureRelationTableItems('notes')

    expect(apiFindMock).toHaveBeenCalledTimes(1)
    expect(apiFindMock).toHaveBeenCalledWith(
      'note',
      expect.objectContaining({
        filter: { ticket: 42 },
        page: 1,
      }),
    )
    expect(relations.relationTableItems.value.notes).toEqual([{ handle: 1, title: 'First note' }])
    expect(relations.relationTableTotal.value.notes).toBe(1)
  })

  it('ignores stale relation responses after item changes reset the table state', async () => {
    const relations = createRelations()
    const deferred = createDeferred<{ data: SaplingGenericItem[]; meta: { total: number } }>()

    apiFindMock.mockReturnValueOnce(deferred.promise)

    await relations.initializeRelationTables()
    const loadingPromise = relations.ensureRelationTableItems('notes')

    relations.resetRelationTableItems()
    deferred.resolve({
      data: [{ handle: 99, title: 'Stale note' }],
      meta: { total: 1 },
    })
    await loadingPromise

    expect(relations.relationTableItems.value.notes).toEqual([])
    expect(relations.relationTableTotal.value.notes).toBe(0)
  })
})

function createRelations() {
  const entity = ref({ handle: 'ticket' } as EntityItem)
  const item = ref({ handle: 42 } as SaplingGenericItem)
  const mode = ref<DialogState>('edit')
  const permissions = ref<AccumulatedPermission[] | null>([
    { entityHandle: 'note', allowRead: true } as AccumulatedPermission,
    { entityHandle: 'event', allowRead: true } as AccumulatedPermission,
  ])
  const showReference = ref(true)
  const templates = ref<EntityTemplate[]>([
    createTemplate({
      name: 'notes',
      type: 'Collection<NoteItem>',
      kind: '1:m',
      referenceName: 'note',
      mappedBy: 'ticket',
    }),
    createTemplate({
      name: 'events',
      type: 'Collection<EventItem>',
      kind: '1:m',
      referenceName: 'event',
      mappedBy: 'ticket',
    }),
  ])

  return useSaplingDialogEditRelations({
    entity: computed(() => entity.value),
    item: computed(() => item.value),
    mode: computed(() => mode.value),
    permissions,
    showReference: computed(() => showReference.value),
    templates: computed(() => templates.value),
    t: (key: string) => key,
    getItemHandle: (record?: SaplingGenericItem | null) => {
      const handle = record?.handle
      return typeof handle === 'string' || typeof handle === 'number' ? handle : null
    },
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
    mappedBy: overrides.mappedBy,
    referenceName: overrides.referenceName,
    options: overrides.options ?? [],
    isAutoIncrement: false,
    isPersistent: true,
    isReference: false,
    referencedPks: [],
    length: undefined,
  } as EntityTemplate
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve,
  }
}
