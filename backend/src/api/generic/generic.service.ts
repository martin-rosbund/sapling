import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { TemplateService } from '../template/template.service';

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
    const populate = template
      .filter((field: any) => field.isReference)
      .map((field: any) => field.name);

    const [items, total] = await this.em.findAndCount(entityClass, where, {
      limit,
      offset,
      orderBy,
      populate,
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
          const subTemplate = this.templateService.getEntityTemplate(field.referenceName);
          const pkField = subTemplate?.find((f: any) => f.isPrimaryKey);
          if (
            pkField &&
            pkField.name &&
            (data as Record<string, any>)[field.name] &&
            (data as Record<string, any>)[field.name][pkField.name] !== undefined
          ) {
            (data as Record<string, any>)[field.name] = (data as Record<string, any>)[field.name][pkField.name];
          }
        }
      }
    }

    const entityClass = this.getEntityClass(entityName);
    const newEntity = this.em.create(entityClass, data as any);
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
