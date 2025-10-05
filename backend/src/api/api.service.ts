import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, EntityName } from '@mikro-orm/core';
import { LanguageItem } from '../entity/LanguageItem';
import { TranslationItem } from '../entity/TranslationItem';

// Die sichere Map, um URL-Pfade auf Entitäten abzubilden
const entityMap: { [key: string]: EntityName<any> } = {
  language: LanguageItem,
  translation: TranslationItem,
};

@Injectable()
export class ApiService {  
    constructor(private readonly em: EntityManager) {}

  getEntityClass(entityName: string) {
    const EntityClass = entityMap[entityName];
    if (!EntityClass) {
      throw new NotFoundException(`Entity '${entityName}' not found`);
    }
    return EntityClass;
  }

async findAndCount(entityName: string, where: object, page: number, limit: number) {
    const EntityClass = this.getEntityClass(entityName);
    const offset = (page - 1) * limit;

    const [items, total] = await this.em.findAndCount(EntityClass, where, { 
      limit,
      offset 
    });
    
    if(page == null) {
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
    const EntityClass = this.getEntityClass(entityName);
    const newEntity = this.em.create(EntityClass, data as any);
    await this.em.flush();
    return newEntity;
  }

  async update(entityName: string, id: string | number, data: object): Promise<any> {
    const EntityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(EntityClass, { id });

    if (!entity) {
      throw new NotFoundException(`Entity '${entityName}' with ID '${id}' not found`);
    }

    // Weise die neuen Daten der gefundenen Entität zu
    this.em.assign(entity, data);
    await this.em.flush();
    return entity;
  }

  async delete(entityName: string, id: string | number): Promise<void> {
    const EntityClass = this.getEntityClass(entityName);
    const reference = this.em.getReference(EntityClass, id);

    if (!reference) {
        throw new NotFoundException(`Entity '${entityName}' with ID '${id}' not found`);
    }

    await this.em.remove(reference).flush();
  }
}