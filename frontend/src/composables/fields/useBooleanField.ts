import { ref } from 'vue';
export function useBooleanField(initial: boolean = false) {
  const value = ref(initial);
  return { value };
}
