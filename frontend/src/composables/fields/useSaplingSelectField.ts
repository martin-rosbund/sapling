import { ref, watch, computed, onMounted, type Ref } from 'vue';
import { formatValue } from '@/utils/saplingFormatUtil';
import { useGenericStore } from '@/stores/genericStore';
import type { SaplingGenericItem } from '@/entity/entity';

export function useSaplingSelectField( props: {
  label: string,
  modelValue?: SaplingGenericItem[],
  entityName: string,
}) {
  return { };
}
