function createMemoryStorage(): Storage {
  let values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values = new Map<string, string>()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

function defineMemoryLocalStorage(target: typeof globalThis | Window): void {
  const descriptor = Object.getOwnPropertyDescriptor(target, 'localStorage')
  if (descriptor?.configurable === false && 'value' in descriptor) {
    return
  }

  Object.defineProperty(target, 'localStorage', {
    configurable: true,
    value: createMemoryStorage(),
  })
}

defineMemoryLocalStorage(globalThis)

if (typeof window !== 'undefined') {
  defineMemoryLocalStorage(window)
}
