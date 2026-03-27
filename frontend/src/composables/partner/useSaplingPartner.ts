import type { EntityTemplate } from "@/entity/structure";
import type { Ref } from 'vue';

export function useSaplingPartner(
  parentFilter?: { value: Record<string, unknown> },
  entityTemplates?: Ref<EntityTemplate[]>,
) {
  function onSelectedPeoplesUpdate(val: Array<string>) {
    let filter: Record<string, unknown> = {};
    const templates = entityTemplates?.value || [];
    // Find all templates with 'isPartner' option
    const partnerTemplates = templates.filter(template => template.options?.includes('isPartner'));

    // Build an $or filter: only one partner field must match, not all
    if (val.length > 0 && partnerTemplates.length > 0) {
      // Each partner field gets its own $in filter
      const orFilters = partnerTemplates.map(template => {
        const propertyName = template.name || '';
        if (propertyName.length > 0) {
          return { [propertyName]: { $in: val } };
        }
        return null;
      }).filter(Boolean);
      if (orFilters.length > 0) {
        filter = { $or: orFilters };
      }
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
