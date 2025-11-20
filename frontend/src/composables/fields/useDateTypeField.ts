import { ref } from 'vue';
export function useDateTypeField(initial: string | null = null) {
  const value = ref(initial);
  return { value };
}
