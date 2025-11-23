import { ref } from 'vue';
export function useSaplingShortTextField(initial: string | null = null) {
  const value = ref(initial);
  return { value };
}
