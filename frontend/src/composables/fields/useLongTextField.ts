import { ref } from 'vue';
export function useLongTextField(initial: string | null = null) {
  const value = ref(initial);
  return { value };
}
