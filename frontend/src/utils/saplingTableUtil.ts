import { ENTITY_SYSTEM_COLUMNS } from "@/constants/project.constants";
import type { EntityItem } from "@/entity/entity";
import type { EntityState, EntityTemplate, SaplingTableHeaderItem } from "@/entity/structure";

export function getRelationTableHeaders(
  relationTableStates: Record<string, EntityState>,
  t: (key: string) => string
) {
    const result: Record<string, SaplingTableHeaderItem[]> = {};
    for (const key in relationTableStates) {
      result[key] = (relationTableStates[key]?.entityTemplates ?? [])
        .filter((x: EntityTemplate) => {
          const template = (relationTableStates[key]?.entityTemplates ?? []).find((t: EntityTemplate) => t.name === x.name);
          return !ENTITY_SYSTEM_COLUMNS.includes(x.name) && !(template && template.isAutoIncrement);
        })
        .map((tpl: EntityTemplate) => ({
          ...tpl,
          key: tpl.name,
          title: t(`${(relationTableStates[key]?.entity?.handle)}.${tpl.name}`),
        }));
    }
    return result;
  }
  
  export function getTableHeaders(
  entityTemplates: EntityTemplate[],
  entity: EntityItem | null,
  t: (key: string) => string
) {
    let result = entityTemplates
      .filter((x: EntityTemplate) => {
        return !ENTITY_SYSTEM_COLUMNS.includes(x.name) 
          && !(x.isAutoIncrement) 
          && !(x.isSecurity) 
          && !((x.length ?? 0) > 256)
          && !['1:m', 'm:n', 'n:m'].includes(x.kind ?? '');
      })
      .map((tpl: EntityTemplate) => ({
        ...tpl,
        key: tpl.name,
        title: t(`${(entity?.handle)}.${tpl.name}`),
      }));
    return result;
  }