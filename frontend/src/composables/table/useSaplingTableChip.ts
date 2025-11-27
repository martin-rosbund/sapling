import type { EntityTemplate } from "@/entity/structure";

export function useSaplingTableChip() {
  function getChipColor(refTemplates: EntityTemplate[], item: any, col: any) {
    const colorField = refTemplates?.find((x) => x.options?.includes('isColor'))?.name;
    return colorField && item[col.key]?.[colorField] ? item[col.key][colorField] : undefined;
  }

  function hasChipIcon(refTemplates: EntityTemplate[], item: any, col: any) {
    const iconField = refTemplates?.find((x) => x.options?.includes('isIcon'))?.name;
    return iconField && item[col.key]?.[iconField];
  }

  function getChipIcon(refTemplates: EntityTemplate[], item: any, col: any) {
    const iconField = refTemplates?.find((x) => x.options?.includes('isIcon'))?.name;
    return iconField ? item[col.key][iconField] : '';
  }
  return { getChipColor, hasChipIcon, getChipIcon };
}
