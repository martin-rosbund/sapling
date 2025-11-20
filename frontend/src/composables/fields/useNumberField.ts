import { ref } from 'vue';
export function useNumberField(initial: number | null = null) {
  const value = ref(initial);
  return { value };
}
