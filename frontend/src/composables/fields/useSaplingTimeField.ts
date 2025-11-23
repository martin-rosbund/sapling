import { ref } from 'vue';
export function useSaplingTimeField(initial: string | null = null) {
  const value = ref(initial);
  return { value };
}
