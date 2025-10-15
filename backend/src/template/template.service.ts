import { EntityManager } from '@mikro-orm/mysql';
import { Injectable } from '@nestjs/common';
import { ENTITY_MAP } from '../generic/entity-registry';

const entityMap = ENTITY_MAP;

@Injectable()
export class TemplateService {
      constructor(private readonly em: EntityManager) {}

getEntityTemplate(entityName: string) {
    const meta = this.em.getMetadata().get(entityMap[entityName]);

    return Object.values(meta.properties).map((prop: any) => ({
      name: prop.name,
      type: prop.type,
      length: prop.length ?? null,
      nullable: prop.nullable ?? true,
      default: prop.default ?? null,
      isPrimaryKey: prop.primary ?? false,
      isAutoIncrement: prop.autoincrement ?? false,
      joinColumns: prop.joinColumns ?? null,
      kind: prop.kind ?? null,
      mappedBy: prop.mappedBy ?? null,
      inversedBy: prop.inversedBy ?? null,
      isReference: ['n:m', '1:m', '1:1', 'm:1'].includes(prop.kind.toLocaleString()) || false,
      isSystem: ['createdAt', 'updatedAt'].includes(prop.name.toLocaleString()) || false
    }));
  }
}
