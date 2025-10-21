
// Import Vue reactivity and Pinia store utilities
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'


/**
 * Pinia store for a simple counter.
 * Provides state, a computed property, and an increment action.
 */
export const useCounterStore = defineStore('counter', () => {
  // State: current count value
  const count = ref(0)
  // Computed: double the current count
  const doubleCount = computed(() => count.value * 2)
  // Action: increment the count by 1
  function increment() {
    count.value++
  }

  // Expose state, computed, and actions
  return { count, doubleCount, increment }
})
