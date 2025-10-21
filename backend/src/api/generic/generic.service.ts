import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, RequiredEntityData, EntityName } from '@mikro-orm/core';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { TemplateService } from '../template/template.service';
import { ScriptClass, ScriptMethods } from 'src/script/core/script.class';
import { EntityItem } from 'src/entity/EntityItem';
import { PersonItem } from 'src/entity/PersonItem';

// Zuordnung von Entitätsnamen zu Klassen
// Mapping of entity names to classes
const entityMap = ENTITY_MAP;

@Injectable()
export class GenericService {
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
  ) {}

  // Gibt die Entitätsklasse für einen Namen zurück
  // Returns the entity class for a given name
  getEntityClass<T = object>(entityName: string): EntityName<T> {
    const entityClass = entityMap[entityName] as EntityName<T> | undefined;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }
    return entityClass;
  }

  /**
   * Ruft eine paginierte Liste von Entitäten ab
   * Retrieves a paginated list of entities
   */
  async findAndCount(
    entityName: string,
    where: object,
    page: number,
    limit: number,
    orderBy: object = {},
  ): Promise<{
    data: object[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const entityClass = this.getEntityClass(entityName);
    const offset = (page - 1) * limit;

    // Relationsfelder aus Template ermitteln
    // Determine relation fields from template
    const template = this.templateService.getEntityTemplate(entityName);
    const populate = template.filter((x) => x.isReference).map((x) => x.name);

    // MikroORM expects entityClass as EntityName<T>, so cast to unknown then object
    const [items, total] = await this.em.findAndCount(entityClass, where, {
      limit,
      offset,
      orderBy,
      populate: populate as any[],
    });

    if (page == null) {
      limit = total;
      page = 1;
    }

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Erstellt einen neuen Eintrag für eine Entität
   * Creates a new entry for an entity
   */
  async create(
    entityName: string,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    currentUser: PersonItem,
  ): Promise<object> {
    delete data.createdAt;
    delete data.updatedAt;

    const template = this.templateService.getEntityTemplate(entityName);

    if (template) {
      for (const field of template) {
        // Auto-Increment-Felder entfernen
        // Remove auto-increment fields
        if (field.isAutoIncrement) {
          delete (data as Record<string, any>)[field.name];
        }
        // Referenzfelder auf Primärschlüssel reduzieren
        // Reduce reference fields to primary key
        if (
          field.isReference &&
          (data as Record<string, any>)[field.name] &&
          typeof (data as Record<string, any>)[field.name] === 'object' &&
          field.referenceName
        ) {
          const subTemplate = this.templateService.getEntityTemplate(
            field.referenceName,
          );
          const pkField = subTemplate?.find((x) => x.isPrimaryKey);
          if (
            pkField &&
            pkField.name &&
            (data as Record<string, any>)[field.name]
          ) {
            const fieldData = (data as Record<string, unknown>)[field.name];
            if (
              fieldData &&
              typeof fieldData === 'object' &&
              pkField.name in fieldData
            ) {
              (data as Record<string, any>)[field.name] = fieldData[
                pkField.name
              ] as string | number | boolean | null | undefined;
            }
          }
        }
      }
    }

    const entity = await this.em.findOne(EntityItem, { handle: entityName });
    if (entity) {
      // Vor dem Einfügen Skript ausführen
      // Run script before insert
      const script = await ScriptClass.runServer(
        ScriptMethods.beforeInsert,
        data,
        entity,
        currentUser,
      );
      data = script.items[0];
    }

    const entityClass = this.getEntityClass(entityName);
    // MikroORM expects entityClass as EntityName<T>, so cast to unknown then object
    const newEntity = this.em.create(
      entityClass,
      data as RequiredEntityData<object>,
    );
    await this.em.flush();
    return newEntity;
  }

  /**
   * Aktualisiert einen Eintrag anhand seiner Primary Keys
   * Updates an entry by its primary keys
   */
  async update(
    entityName: string,
    pk: Record<string, any>,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
  ): Promise<object> {
    delete data.createdAt;
    delete data.updatedAt;

    const entityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(entityClass, pk);

    if (!entity) {
      throw new NotFoundException(`global.updateError`);
    }

    this.em.assign(entity, data);
    await this.em.flush();
    return entity;
  }

  /**
   * Löscht einen Eintrag anhand seiner Primary Keys
   * Deletes an entry by its primary keys
   */
  async delete(entityName: string, pk: Record<string, any>): Promise<void> {
    const entityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(entityClass, pk);

    if (!entity) {
      throw new NotFoundException(`global.deleteError`);
    }

    await this.em.remove(entity).flush();
  }
}
