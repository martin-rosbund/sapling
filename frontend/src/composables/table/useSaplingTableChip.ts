export function useSaplingTableChip() {
  function getChipColor(refTemplates: any, item: any, col: any) {
    const colorField = refTemplates?.find((t: any) => t.isColor)?.name;
    return colorField && item[col.key]?.[colorField] ? item[col.key][colorField] : undefined;
  }
  function hasChipIcon(refTemplates: any, item: any, col: any) {
    const iconField = refTemplates?.find((t: any) => t.isIcon)?.name;
    return iconField && item[col.key]?.[iconField];
  }
  function getChipIcon(refTemplates: any, item: any, col: any) {
    const iconField = refTemplates?.find((t: any) => t.isIcon)?.name;
    return iconField ? item[col.key][iconField] : '';
  }
  return { getChipColor, hasChipIcon, getChipIcon };
}
