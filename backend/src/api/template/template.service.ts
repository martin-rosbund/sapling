import { EntityManager } from '@mikro-orm/mysql';
import { Injectable } from '@nestjs/common';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { EntityTemplateDto } from './dto/entity-template.dto';
import {
  getSaplingOptions,
  hasSaplingOption,
} from 'src/entity/global/entity.decorator';

// Mapping of entity names to their classes
const entityMap = ENTITY_MAP;

@Injectable()
// Service for retrieving entity template metadata
export class TemplateService {
  /**
   * Injects the MikroORM EntityManager for metadata access.
   * @param em - EntityManager instance
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Returns the metadata template for a given entity.
   * @param entityName - The name of the entity
   * @returns Array of EntityTemplate objects describing the entity's properties
   */
  getEntityTemplate(entityName: string): EntityTemplateDto[] {
    // Ensure entityMap[entityName] is defined and is a class constructor
    const entityClass = entityMap[entityName] as { name?: string } | undefined;
    if (!entityClass || typeof entityClass !== 'function') {
      throw new Error(
        `Entity '${entityName}' not found in entityMap or is not a class.`,
      );
    }
    const meta = this.em.getMetadata().get(entityClass);

    return Object.values(meta.properties).map((prop) => {
      const entityNameFromType =
        Object.keys(entityMap).find((key) => {
          const mapEntry = entityMap[key] as { name?: string };
          return (
            mapEntry &&
            typeof mapEntry.name === 'string' &&
            mapEntry.name === prop.type
          );
        }) ?? null;

      return {
        name: prop.name,
        type: prop.type,
        referenceName: entityNameFromType ?? '',
        length: prop.length ?? null,
        nullable: prop.nullable ?? true,
        default: prop.default ?? null,
        isPrimaryKey: prop.primary ?? false,
        isAutoIncrement: prop.autoincrement ?? false,
        referencedPks: prop.referencedPKs ?? [],
        kind: prop.kind ?? null,
        mappedBy: prop.mappedBy ?? null,
        inversedBy: prop.inversedBy ?? null,
        isPersistent: prop.persist ?? true,
        isReference: ['m:n', '1:m', '1:1', 'm:1'].includes(prop.kind ?? ''),
        isSystem: ['createdAt', 'updatedAt'].includes(prop.name ?? ''),
        isRequired:
          (!prop.nullable || prop.primary) &&
          !hasSaplingOption(
            entityClass.prototype as object,
            prop.name,
            'isReadOnly',
          )
            ? true
            : false,
        options: getSaplingOptions(entityClass.prototype as object, prop.name),
      };
    });
  }
}
