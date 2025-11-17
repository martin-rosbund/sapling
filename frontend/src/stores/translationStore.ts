import { defineStore } from 'pinia'

/**
 * Pinia store for tracking loaded translation entities and the current language.
 * - Stores a set of loaded entity names to avoid redundant backend requests.
 * - Stores the current language and resets loaded entities when the language changes.
 */
export const useTranslationStore = defineStore('translationStore', {
  state: () => ({
    /**
     * Set of entity names for which translations have already been loaded.
     */
    entities: new Set<string>(),
    /**
     * Currently active language code.
     */
    language: 'de'
  }),
  actions: {
    /**
     * Checks if translations for the given entity have already been loaded.
     * @param entity The entity name to check.
     * @returns True if the entity is already loaded, false otherwise.
     */
    has(entity: string) {
      return this.entities.has(entity)
    },
    /**
     * Marks a single entity as loaded.
     * @param entity The entity name to add.
     */
    add(entity: string) {
      this.entities.add(entity)
    },
    /**
     * Marks multiple entities as loaded.
     * @param entities Array of entity names to add.
     */
    addMany(entities: string[]) {
      entities.forEach(e => this.entities.add(e))
    },
    /**
     * Clears the set of loaded entities.
     */
    clear() {
      this.entities.clear()
    },
    /**
     * Sets the current language. If the language changes, resets loaded entities.
     * @param lang The new language code.
     */
    setLanguage(lang: string) {
      if (this.language !== lang) {
        this.language = lang
        this.clear()
      }
    }
  }
})