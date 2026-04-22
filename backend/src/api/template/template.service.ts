import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { EntityTemplateDto } from './dto/entity-template.dto';
import {
  getSaplingFormLayout,
  getSaplingReferenceDependency,
  getSaplingOptions,
  hasSaplingOption,
} from '../../entity/global/entity.decorator';

// Mapping of entity handles to their classes
const entityMap = ENTITY_MAP;

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for retrieving entity template metadata.
 *
 * @property        em                   EntityManager for metadata access
 * @method          constructor          Injects the EntityManager
 * @method          getEntityTemplate    Returns metadata template for a given entity
 */
@Injectable()
export class TemplateService {
  /**
   * Injects the MikroORM EntityManager for metadata access.
   * @param em EntityManager instance
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Returns the metadata template for a given entity.
   * @param entityHandle The name of the entity
   * @returns Array of EntityTemplateDto objects describing the entity's properties
   */
  getEntityTemplate(entityHandle: string): EntityTemplateDto[] {
    // Ensure entityMap[entityHandle] is defined and is a class constructor
    const entityClass = entityMap[entityHandle] as
      | { name?: string }
      | undefined;
    if (!entityClass || typeof entityClass !== 'function') {
      throw new Error('global.entityNotFound');
    }
    const meta = this.em.getMetadata().get(entityClass);

    return Object.values(meta.properties).map((prop) => {
      const isReadOnly = hasSaplingOption(
        entityClass.prototype as object,
        prop.name,
        'isReadOnly',
      );
      const formLayout = getSaplingFormLayout(
        entityClass.prototype as object,
        prop.name,
      );
      const isCollectionRelation = ['m:n', '1:m'].includes(prop.kind ?? '');

      const entityHandleFromType =
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
        referenceName: entityHandleFromType ?? '',
        length: prop.length ?? null,
        nullable: prop.nullable ?? true,
        default: prop.default ?? null,
        defaultRaw: prop.defaultRaw
          ? String(prop.defaultRaw).replace(/^['"]|['"]$/g, '')
          : null,
        isPrimaryKey: prop.primary ?? false,
        isAutoIncrement: prop.autoincrement ?? false,
        referencedPks: prop.referencedPKs ?? [],
        kind: prop.kind ?? null,
        mappedBy: prop.mappedBy ?? null,
        inversedBy: prop.inversedBy ?? null,
        isUnique: prop.unique == true,
        isPersistent: prop.persist ?? true,
        isReference: ['m:n', '1:m', '1:1', 'm:1'].includes(prop.kind ?? ''),
        isRequired:
          !(prop.nullable ?? true) &&
          !(prop.primary ?? false) &&
          !(prop.autoincrement ?? false) &&
          !isReadOnly &&
          !isCollectionRelation,
        options: getSaplingOptions(entityClass.prototype as object, prop.name),
        formGroup: formLayout.group,
        formOrder: formLayout.order,
        formWidth: formLayout.width,
        referenceDependency: getSaplingReferenceDependency(
          entityClass.prototype as object,
          prop.name,
        ),
      };
    });
  }
}
