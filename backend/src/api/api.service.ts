import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ENTITY_MAP } from './entity-registry';

const entityMap = ENTITY_MAP;

@Injectable()
export class ApiService {
  constructor(private readonly em: EntityManager) {}

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

    const [items, total] = await this.em.findAndCount(entityClass, where, {
      limit,
      offset,
      orderBy,
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
    const entityClass = this.getEntityClass(entityName);
    const newEntity = this.em.create(entityClass, data as any);
    await this.em.flush();
    return newEntity;
  }

  async update(
    entityName: string,
    pk: Record<string, any>,
    data: object,
  ): Promise<any> {
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

  getEntityTemplate(entityName: string) {
    //const EntityClass = this.getEntityClass(entityName);
    const EntityClass = this.getEntityClass(entityName);
    const meta = this.em.getMetadata().get(entityMap[entityName]);

    return Object.values(meta.properties).map((prop: any) => ({
      name: prop.name,
      type: prop.type,
      length: prop.length ?? null,
      nullable: prop.nullable ?? false,
      default: prop.default ?? null,
      isPrimaryKey: prop.primary ?? false,
    }));
  }
}
