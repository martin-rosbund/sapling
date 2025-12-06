import { ENTITY_SYSTEM_COLUMNS } from "@/constants/project.constants";
import type { EntityItem, SaplingGenericItem } from "@/entity/entity";
import type { EntityState, EntityTemplate, SaplingTableHeaderItem } from "@/entity/structure";
import { formatValue } from "./saplingFormatUtil";

// Helper functions for generating table headers based on entity templates
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
  
// Helper function for generating table headers for a single entity
export function getTableHeaders(
  entityTemplates: EntityTemplate[],
  entity: EntityItem | null,
  t: (key: string) => string
) {
    const result = entityTemplates
      .filter((x: EntityTemplate) => {
        return !ENTITY_SYSTEM_COLUMNS.includes(x.name) 
          && !(x.isAutoIncrement) 
          && !(x.options?.includes('isSecurity')) 
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

  export function getCompactLabel(item?: SaplingGenericItem, entityTemplates?: EntityTemplate[]): string {
    if (!item || !entityTemplates) return '';
    return entityTemplates
      .filter(x => x.options?.includes('isShowInCompact'))
      .map(x => formatValue(String(item[x.name] ?? ''), x.type))
      .join(' ');
  }