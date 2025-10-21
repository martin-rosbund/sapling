import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { TemplateService } from '../template/template.service';
import { ScriptClass, ScriptMethods } from 'src/script/core/script.class';
import { EntityItem } from 'src/entity/EntityItem';
import { PersonItem } from 'src/entity/PersonItem';

const entityMap = ENTITY_MAP;

@Injectable()
export class GenericService {
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
  ) {}

  getEntityClass(entityName: string) {
    const entityClass = entityMap[entityName];
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }
    return entityClass;
  }

  async findAndCount(
    entityName: string,
    where: object,
    page: number,
    limit: number,
    orderBy: object = {},
  ) {
    const entityClass = this.getEntityClass(entityName);
    const offset = (page - 1) * limit;

    // Relationsfelder aus Template ermitteln
    const template = this.templateService.getEntityTemplate(entityName);
    const populate = template.filter((x) => x.isReference).map((x) => x.name);

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

  async create(
    entityName: string,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    currentUser: PersonItem,
  ): Promise<any> {
    delete data.createdAt;
    delete data.updatedAt;

    const template = this.templateService.getEntityTemplate(entityName);

    if (template) {
      for (const field of template) {
        // Auto-Increment-Felder entfernen
        if (field.isAutoIncrement) {
          delete (data as Record<string, any>)[field.name];
        }
        // Referenzfelder auf Primärschlüssel reduzieren
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
      const script = await ScriptClass.runServer(
        ScriptMethods.beforeInsert,
        data,
        entity,
        currentUser,
      );
      data = script.items[0];
    }

    const entityClass = this.getEntityClass(entityName);
    const newEntity = this.em.create(
      entityClass,
      data as RequiredEntityData<InstanceType<typeof entityClass>>,
    );
    await this.em.flush();
    return newEntity;
  }

  async update(
    entityName: string,
    pk: Record<string, any>,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
  ): Promise<any> {
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

  async delete(entityName: string, pk: Record<string, any>): Promise<void> {
    const entityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(entityClass, pk);

    if (!entity) {
      throw new NotFoundException(`global.deleteError`);
    }

    await this.em.remove(entity).flush();
  }
}
