import { ref, onMounted, watch } from 'vue'
import TranslationService from '@/services/translation.service'
import { i18n } from '@/i18n'
import type { TranslationItem } from '@/entity/entity'

// Cache für geladene Übersetzungen: Map<key, Promise<TranslationItem[]>>
const translationLoadCache = new Map<string, Promise<TranslationItem[]>>()

function getCacheKey(namespaces: string[], locale: string) {
  return namespaces.sort().join(',') + '|' + locale
}

type UseTranslationLoaderOptions = {
  autoLoad?: boolean
}

export function useTranslationLoader(...args: Array<string | UseTranslationLoaderOptions>) {
  const lastArgument = args[args.length - 1]
  const options =
    typeof lastArgument === 'object' && lastArgument !== null && !Array.isArray(lastArgument)
      ? lastArgument
      : undefined
  const namespaces = (options ? args.slice(0, -1) : args) as string[]

  const translationService = ref(new TranslationService())
  const autoLoad = options?.autoLoad ?? true
  const isLoading = ref(autoLoad)

  function triggerLoadTranslations() {
    void loadTranslations().catch(() => undefined)
  }

  async function loadTranslations() {
    isLoading.value = true
    const locale = i18n.global.locale.value
    const cacheKey = getCacheKey(namespaces, locale)
    let promise = translationLoadCache.get(cacheKey)
    if (!promise) {
      promise = translationService.value.prepare(...namespaces)
      promise = promise.catch((error) => {
        translationLoadCache.delete(cacheKey)
        throw error
      })
      translationLoadCache.set(cacheKey, promise)
    }

    try {
      await promise
    } finally {
      isLoading.value = false
    }
  }

  // Nur beim Mounten laden, Watcher nur auslösen wenn sich die Sprache wirklich ändert
  let lastLocale = i18n.global.locale.value
  onMounted(() => {
    if (autoLoad) {
      triggerLoadTranslations()
    }
  })
  watch(
    () => i18n.global.locale.value,
    (newLocale) => {
      if (newLocale !== lastLocale && autoLoad) {
        lastLocale = newLocale
        triggerLoadTranslations()
      }
    },
  )

  return { translationService, isLoading, loadTranslations }
}
