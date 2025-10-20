import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ENTITY_MAP } from '../entity/global/entity.registry';
import { TemplateService } from 'src/template/template.service';

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
      throw new NotFoundException(`Entity '${entityName}' not found`);
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

  async create(entityName: string, data: object): Promise<any> {
    delete (data as any).createdAt;
    delete (data as any).updatedAt;

    const template = this.templateService.getEntityTemplate(entityName);

    if (template) {
      for (const field of template) {
        if (field.isAutoIncrement) {
          delete (data as any)[field.name];
        }
      }
    }

    const entityClass = this.getEntityClass(entityName);
    const newEntity = this.em.upsert(entityClass, data as any);
    await this.em.flush();
    return newEntity;
  }

  async update(
    entityName: string,
    pk: Record<string, any>,
    data: object,
  ): Promise<any> {
    delete (data as any).createdAt;
    delete (data as any).updatedAt;

    const entityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(entityClass, pk);

    if (!entity) {
      throw new NotFoundException(
        `Entity '${entityName}' with PK '${JSON.stringify(pk)}' not found`,
      );
    }

    this.em.assign(entity, data);
    await this.em.flush();
    return entity;
  }

  async delete(entityName: string, pk: Record<string, any>): Promise<void> {
    const entityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(entityClass, pk);

    if (!entity) {
      throw new NotFoundException(
        `Entity '${entityName}' with PK '${JSON.stringify(pk)}' not found`,
      );
    }

    await this.em.remove(entity).flush();
  }
}
