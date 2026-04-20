import { useSaplingSelectField } from './useSaplingSelectField'
import type { SaplingGenericItem } from '@/entity/entity'

export function useSaplingSelectAddField(props: {
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem[]
  rules?: Array<(v: unknown) => true | string>
}) {
  // Hole die Basisfunktionalität
  const base = useSaplingSelectField(props)

  return {
    ...base,
  }
}
