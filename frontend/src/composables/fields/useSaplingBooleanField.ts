import { ref } from 'vue';
export function useSaplingBooleanField(initial: boolean = false) {
  const value = ref(initial);
  return { value };
}
