import { useSaplingSingleSelectField } from './useSaplingSingleSelectField';
import type { SaplingGenericItem } from '@/entity/entity';

export function useSaplingSingleSelectAddField(props: {
  label: string,
  entityName: string,
  modelValue?: SaplingGenericItem,
  rules?: Array<(v: unknown) => true | string>;
}) {
  // Hole die Basisfunktionalität
  const base = useSaplingSingleSelectField(props);

  // Zusätzliche Methoden oder State können hier ergänzt werden
  // Beispiel: addSelected emit vorbereiten

  return {
    ...base,
  };
}
