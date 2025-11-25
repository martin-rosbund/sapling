import { ENTITY_SYSTEM_COLUMNS } from "@/constants/project.constants";
import type { EntityState, EntityTemplate, SaplingTableHeaderItem } from "@/entity/structure";

export function getRelationTableHeaders(
  relationTableState: Record<string, EntityState>,
  t: (key: string) => string
) {
    const result: Record<string, SaplingTableHeaderItem[]> = {};
    for (const key in relationTableState) {
      result[key] = (relationTableState[key]?.entityTemplates ?? [])
        .filter((x: EntityTemplate) => {
          const template = (relationTableState[key]?.entityTemplates ?? []).find((t: EntityTemplate) => t.name === x.name);
          return !ENTITY_SYSTEM_COLUMNS.includes(x.name) && !(template && template.isAutoIncrement);
        })
        .map((tpl: EntityTemplate) => ({
          ...tpl,
          key: tpl.name,
          title: t(`${(relationTableState[key]?.entity?.handle)}.${tpl.name}`),
        }));
    }
    return result;
  }