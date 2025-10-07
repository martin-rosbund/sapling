import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, EntityName } from '@mikro-orm/core';
import { LanguageItem } from '../entity/LanguageItem';
import { TranslationItem } from '../entity/TranslationItem';
import { PersonItem } from 'src/entity/PersonItem';
import { CompanyItem } from 'src/entity/CompanyItem';
import { EntityItem } from 'src/entity/EntityItem';
import { RoleItem } from 'src/entity/RoleItem';
import { NoteItem } from 'src/entity/NoteItem';
import { PermissionItem } from 'src/entity/PermissionItem';
import { RightItem } from 'src/entity/RightItem';
import { TicketItem } from 'src/entity/TicketItem';
import { TicketPriorityItem } from 'src/entity/TicketPriorityItem';
import { TicketStatusItem } from 'src/entity/TicketStatusItem';
import { ProductItem } from 'src/entity/ProductItem';
import { ContractItem } from 'src/entity/ContractItem';

const entityMap: { [key: string]: EntityName<any> } = {
  company: CompanyItem,
  contract: ContractItem,
  entity: EntityItem,
  role: RoleItem,
  language: LanguageItem,
  note: NoteItem,
  permission: PermissionItem,
  person: PersonItem,
  product: ProductItem,
  right: RightItem,
  ticket: TicketItem,
  'ticket-priority': TicketPriorityItem,
  'ticket-status': TicketStatusItem,
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

  async findAndCount(
    entityName: string,
    where: object,
    page: number,
    limit: number,
  ) {
    const EntityClass = this.getEntityClass(entityName);
    const offset = (page - 1) * limit;

    const [items, total] = await this.em.findAndCount(EntityClass, where, {
      limit,
      offset,
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
    const EntityClass = this.getEntityClass(entityName);
    const newEntity = this.em.create(EntityClass, data as any);
    await this.em.flush();
    return newEntity;
  }

  async update(
    entityName: string,
    pk: Record<string, any>,
    data: object,
  ): Promise<any> {
    const EntityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(EntityClass, pk);

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
    const EntityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(EntityClass, pk);

    if (!entity) {
      throw new NotFoundException(
        `Entity '${entityName}' with PK '${JSON.stringify(pk)}' not found`,
      );
    }

    await this.em.remove(entity).flush();
  }
}
