import { reactive } from 'vue'
import type { SaplingGenericItem } from '@/entity/entity'
import ApiGenericService from '@/services/api.generic.service'
import { useGenericStore } from '@/stores/genericStore'

type GenericReferenceCacheStatus = 'idle' | 'loading' | 'loaded' | 'missing' | 'error'

type GenericReferenceCacheEntry = {
  status: GenericReferenceCacheStatus
  item: SaplingGenericItem | null
}

const genericReferenceCache = reactive<Record<string, GenericReferenceCacheEntry>>({})
const queuedReferences = new Map<string, Map<string, string | number>>()
let queuedFlushTimeout: ReturnType<typeof setTimeout> | null = null

function normalizeEntityHandle(entityHandle: string): string {
  return entityHandle.trim()
}

function normalizeHandle(handle: string | number): string | number {
  return typeof handle === 'string' ? handle.trim() : handle
}

function getCacheKey(entityHandle: string, handle: string | number): string {
  return `${normalizeEntityHandle(entityHandle)}::${String(normalizeHandle(handle))}`
}

function getExistingEntry(entityHandle?: string, handle?: string | number | null) {
  if (!entityHandle || handle == null) {
    return null
  }

  return genericReferenceCache[getCacheKey(entityHandle, handle)] ?? null
}

function setEntry(
  entityHandle: string,
  handle: string | number,
  entry: GenericReferenceCacheEntry,
) {
  genericReferenceCache[getCacheKey(entityHandle, handle)] = entry
}

async function fetchGenericReferenceRecords(
  entityHandle: string,
  handles: Array<string | number>,
  genericStore: ReturnType<typeof useGenericStore>,
) {
  const normalizedEntityHandle = normalizeEntityHandle(entityHandle)
  const normalizedHandles = handles.map((handle) => normalizeHandle(handle))

  if (!normalizedEntityHandle || normalizedHandles.length === 0) {
    return
  }

  normalizedHandles.forEach((handle) => {
    setEntry(normalizedEntityHandle, handle, {
      status: 'loading',
      item: getExistingEntry(normalizedEntityHandle, handle)?.item ?? null,
    })
  })

  try {
    await genericStore.loadGeneric(normalizedEntityHandle, 'global')

    const result = await ApiGenericService.find<SaplingGenericItem>(normalizedEntityHandle, {
      filter:
        normalizedHandles.length === 1
          ? { handle: normalizedHandles[0] }
          : {
              $or: normalizedHandles.map((handle) => ({ handle })),
            },
      limit: normalizedHandles.length,
      relations: ['m:1'],
    })

    const foundHandles = new Set<string>()

    result.data.forEach((item) => {
      const itemHandle = item.handle
      if (itemHandle == null) {
        return
      }

      const normalizedItemHandle = normalizeHandle(itemHandle)
      foundHandles.add(String(normalizedItemHandle))
      setEntry(normalizedEntityHandle, normalizedItemHandle, {
        status: 'loaded',
        item,
      })
    })

    normalizedHandles.forEach((handle) => {
      if (foundHandles.has(String(handle))) {
        return
      }

      setEntry(normalizedEntityHandle, handle, {
        status: 'missing',
        item: null,
      })
    })
  } catch {
    normalizedHandles.forEach((handle) => {
      setEntry(normalizedEntityHandle, handle, {
        status: 'error',
        item: null,
      })
    })
  }
}

async function flushQueuedReferences(genericStore: ReturnType<typeof useGenericStore>) {
  const queuedBatches = Array.from(queuedReferences.entries()).map(([entityHandle, handleMap]) => ({
    entityHandle,
    handles: Array.from(handleMap.values()),
  }))

  queuedReferences.clear()

  await Promise.all(
    queuedBatches.map(({ entityHandle, handles }) =>
      fetchGenericReferenceRecords(entityHandle, handles, genericStore),
    ),
  )
}

export function useSaplingGenericReferenceLookup() {
  const genericStore = useGenericStore()

  function getEntry(entityHandle?: string, handle?: string | number | null) {
    return getExistingEntry(entityHandle, handle)
  }

  function queuePrefetch(entityHandle: string, handle: string | number) {
    const normalizedEntityHandle = normalizeEntityHandle(entityHandle)
    const normalizedHandle = normalizeHandle(handle)

    if (!normalizedEntityHandle || normalizedHandle === '') {
      return
    }

    const existingEntry = getExistingEntry(normalizedEntityHandle, normalizedHandle)
    if (existingEntry?.status === 'loaded' || existingEntry?.status === 'loading') {
      return
    }

    if (!queuedReferences.has(normalizedEntityHandle)) {
      queuedReferences.set(normalizedEntityHandle, new Map())
    }

    queuedReferences.get(normalizedEntityHandle)?.set(String(normalizedHandle), normalizedHandle)

    if (queuedFlushTimeout) {
      return
    }

    queuedFlushTimeout = setTimeout(() => {
      queuedFlushTimeout = null
      void flushQueuedReferences(genericStore)
    }, 0)
  }

  async function ensureResolved(entityHandle: string, handle: string | number) {
    const normalizedEntityHandle = normalizeEntityHandle(entityHandle)
    const normalizedHandle = normalizeHandle(handle)

    if (!normalizedEntityHandle || normalizedHandle === '') {
      return null
    }

    const existingEntry = getExistingEntry(normalizedEntityHandle, normalizedHandle)
    if (existingEntry?.status === 'loaded') {
      return existingEntry.item
    }

    await fetchGenericReferenceRecords(normalizedEntityHandle, [normalizedHandle], genericStore)
    return getExistingEntry(normalizedEntityHandle, normalizedHandle)?.item ?? null
  }

  return {
    getEntry,
    queuePrefetch,
    ensureResolved,
  }
}
