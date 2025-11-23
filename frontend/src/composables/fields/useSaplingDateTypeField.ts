import { ref } from 'vue';
export function useSaplingDateTimeField(initial: string | null = null) {
  const value = ref(initial);
  return { value };
}
