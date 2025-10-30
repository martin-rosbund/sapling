import { EntityManager } from '@mikro-orm/mysql';
import { Injectable } from '@nestjs/common';
import { ENTITY_MAP } from '../../entity/global/entity.registry';

// Mapping of entity names to their classes
const entityMap = ENTITY_MAP;

/**
 * Interface describing the metadata of an entity property.
 */
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
  getEntityTemplate(entityName: string): EntityTemplate[] {
    // Ensure entityMap[entityName] is defined and is a class constructor
    const entityClass = entityMap[entityName] as { name?: string } | undefined;
    if (!entityClass || typeof entityClass !== 'function') {
      throw new Error(
        `Entity '${entityName}' not found in entityMap or is not a class.`,
      );
    }
    const meta = this.em.getMetadata().get(entityClass);

    return Object.values(meta.properties)
      .filter((x) => x.persist !== false)
      .map((prop) => {
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
          joinColumns: prop.joinColumns ?? null,
          kind: prop.kind ?? null,
          mappedBy: prop.mappedBy ?? null,
          inversedBy: prop.inversedBy ?? null,
          isReference:
            ['m:n', '1:m', '1:1', 'm:1'].includes(
              prop.kind?.toLocaleString(),
            ) || false,
          isSystem:
            ['createdAt', 'updatedAt'].includes(prop.name?.toLocaleString()) ||
            false,
          isRequired: prop.nullable === false || prop.primary === true,
        };
      });
  }
}
