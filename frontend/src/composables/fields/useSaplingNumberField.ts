import { ref } from 'vue';
export function useSaplingNumberField(initial: number | null = null) {
  const value = ref(initial);
  return { value };
}
