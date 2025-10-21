import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, RequiredEntityData, EntityName } from '@mikro-orm/core';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { TemplateService } from '../template/template.service';
import { ScriptClass, ScriptMethods } from 'src/script/core/script.class';
import { EntityItem } from 'src/entity/EntityItem';
import { PersonItem } from 'src/entity/PersonItem';

// Mapping of entity names to classes
const entityMap = ENTITY_MAP;

@Injectable()
export class GenericService {
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
  ) {}

  // Returns the entity class for a given name
  getEntityClass<T = object>(entityName: string): EntityName<T> {
    const entityClass = entityMap[entityName] as EntityName<T> | undefined;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }
    return entityClass;
  }

  /**
   * Retrieves a paginated list of entities
   */
  async findAndCount(
    entityName: string,
    where: object,
    page: number,
    limit: number,
    orderBy: object = {},
    currentUser: PersonItem,
  ): Promise<{
    data: object[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const entityClass = this.getEntityClass(entityName);
    const offset = (page - 1) * limit;

    // Determine relation fields from template
    const template = this.templateService.getEntityTemplate(entityName);
    const entity = await this.em.findOne(EntityItem, { handle: entityName });
    const populate = template.filter((x) => x.isReference).map((x) => x.name);

    if (entity) {
      // Run script before read
      const script = await ScriptClass.runServer(
        ScriptMethods.beforeRead,
        where,
        entity,
        currentUser,
      );
      where = script.items;
    }

    // MikroORM expects entityClass as EntityName<T>, so cast to unknown then object
    let [items, total] = await this.em.findAndCount(entityClass, where, {
      limit,
      offset,
      orderBy,
      populate: populate as any[],
    });

    if (page == null) {
      limit = total;
      page = 1;
    }

    if (entity) {
      // Run script after read
      const script = await ScriptClass.runServer(
        ScriptMethods.afterRead,
        items,
        entity,
        currentUser,
      );
      items = script.items;
      total = items.length;
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
    const entity = await this.em.findOne(EntityItem, { handle: entityName });

    if (template) {
      for (const field of template) {
        // Remove auto-increment fields
        if (field.isAutoIncrement) {
          delete (data as Record<string, any>)[field.name];
        }
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

    if (entity) {
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
    let newItem = this.em.create(
      entityClass,
      data as RequiredEntityData<object>,
    );
    await this.em.flush();

    if (entity) {
      // Run script after insert
      const script = await ScriptClass.runServer(
        ScriptMethods.afterInsert,
        newItem,
        entity,
        currentUser,
      );
      newItem = script.items[0];
    }
    return newItem;
  }

  /**
   * Updates an entry by its primary keys
   */
  async update(
    entityName: string,
    pk: Record<string, any>,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    currentUser: PersonItem,
  ): Promise<object> {
    delete data.createdAt;
    delete data.updatedAt;

    const entityClass = this.getEntityClass(entityName);
    const item = await this.em.findOne(entityClass, pk);
    const entity = await this.em.findOne(EntityItem, { handle: entityName });

    if (!item) {
      throw new NotFoundException(`global.updateError`);
    }

    if (entity) {
      // Run script before update
      const script = await ScriptClass.runServer(
        ScriptMethods.beforeUpdate,
        data,
        entity,
        currentUser,
      );
      data = script.items[0];
    }

    this.em.assign(item, data);
    await this.em.flush();

    if (entity) {
      // Run script after update
      const script = await ScriptClass.runServer(
        ScriptMethods.afterUpdate,
        data,
        entity,
        currentUser,
      );
      data = script.items[0];
    }
    return item;
  }

  /**
   * Deletes an entry by its primary keys
   */
  async delete(
    entityName: string,
    pk: Record<string, any>,
    currentUser: PersonItem,
  ): Promise<void> {
    const entityClass = this.getEntityClass(entityName);
    let item = await this.em.findOne(entityClass, pk);
    const entity = await this.em.findOne(EntityItem, { handle: entityName });

    if (!item) {
      throw new NotFoundException(`global.deleteError`);
    }

    if (entity) {
      // Run script before delete
      const script = await ScriptClass.runServer(
        ScriptMethods.beforeDelete,
        item,
        entity,
        currentUser,
      );
      item = script.items[0];
    }

    await this.em.remove(item).flush();

    if (entity) {
      // Run script after delete
      const script = await ScriptClass.runServer(
        ScriptMethods.afterDelete,
        item,
        entity,
        currentUser,
      );
      item = script.items[0];
    }
  }
}
