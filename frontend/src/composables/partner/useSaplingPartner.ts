import type { EntityTemplate } from "@/entity/structure";
import type { Ref } from 'vue';

export function useSaplingPartner(
  parentFilter?: { value: Record<string, unknown> },
  entityTemplates?: Ref<EntityTemplate[]>,
) {
  function onSelectedPeoplesUpdate(val: Array<string>) {
    let filter: Record<string, unknown> = {};

    let propertyName = '';
    const templates = entityTemplates?.value || [];
    const partnerTemplate = templates.find(template => template.options?.includes('isPartner'));
    if (partnerTemplate) {
      propertyName = partnerTemplate.name || '';
    }

    if (val.length > 0 && propertyName.length > 0) {
      filter = { ...filter, [propertyName]: { $in: val } };
    }

    if (parentFilter) {
      parentFilter.value = { ...filter };
    }
  }
  // #region Return
  return {
    onSelectedPeoplesUpdate
  };
  // #endregion
}
