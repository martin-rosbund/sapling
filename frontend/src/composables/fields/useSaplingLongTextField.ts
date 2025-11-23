import { ref } from 'vue';
export function useSaplingLongTextField(initial: string | null = null) {
  const value = ref(initial);
  return { value };
}
