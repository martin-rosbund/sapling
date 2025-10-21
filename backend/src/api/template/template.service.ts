import { EntityManager } from '@mikro-orm/mysql';
import { Injectable } from '@nestjs/common';
import { ENTITY_MAP } from '../../entity/global/entity.registry';

const entityMap = ENTITY_MAP;

export interface EntityTemplate {
  name: string;
  type: string;
  length: number | null;
  default: any;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  joinColumns: any[];
  kind: string | null;
  mappedBy: string | null;
  inversedBy: string | null;
  referenceName: string;
  isReference: boolean;
  isSystem: boolean;
  isRequired: boolean;
  nullable: boolean;
}

@Injectable()
export class TemplateService {
  constructor(private readonly em: EntityManager) {}

  getEntityTemplate(entityName: string): EntityTemplate[] {
    const meta = this.em.getMetadata().get(entityMap[entityName]);

    return Object.values(meta.properties).map((prop) => {
      const entityNameFromType =
        Object.keys(entityMap).find(
          (key) => entityMap[key].name === prop.type,
        ) ?? null;

      return {
        name: prop.name,
        type: prop.type,
        referenceName: entityNameFromType ?? '',
        length: prop.length ?? null,
        nullable: prop.nullable ?? true,
        default: prop.default ?? null,
        isPrimaryKey: prop.primary ?? false,
        isAutoIncrement: prop.autoincrement ?? false,
        joinColumns: prop.joinColumns ?? null,
        kind: prop.kind ?? null,
        mappedBy: prop.mappedBy ?? null,
        inversedBy: prop.inversedBy ?? null,
        isReference:
          ['m:n', '1:m', '1:1', 'm:1'].includes(prop.kind?.toLocaleString()) ||
          false,
        isSystem:
          ['createdAt', 'updatedAt'].includes(prop.name?.toLocaleString()) ||
          false,
        isRequired: prop.nullable === false || prop.primary === true,
      };
    });
  }
}
