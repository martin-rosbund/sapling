import { ref } from 'vue';
export function useTimeField(initial: string | null = null) {
  const value = ref(initial);
  return { value };
}
