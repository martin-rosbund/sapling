import { ref } from 'vue';
export function useShortTextField(initial: string | null = null) {
  const value = ref(initial);
  return { value };
}
