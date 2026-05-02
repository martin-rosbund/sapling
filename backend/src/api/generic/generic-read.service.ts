import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import { ScriptMethods, ScriptService } from '../script/script.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericFilterService } from './generic-filter.service';
import { GenericPermissionService } from './generic-permission.service';

type GenericReadPreparationOptions = {
  runBeforeReadScript?: boolean;
  includeAfterReadScript?: boolean;
};

@Injectable()
export class GenericReadService {
  constructor(
    private readonly em: EntityManager,
    private readonly scriptService: ScriptService,
    private readonly genericFilterService: GenericFilterService,
    private readonly genericPermissionService: GenericPermissionService,
  ) {}

  async prepareWhere(
    entityHandle: string,
    where: object,
    currentUser: PersonItem,
    template: EntityTemplateDto[] = [],
    options: GenericReadPreparationOptions = {},
  ): Promise<{ entity: EntityItem | null; where: object }> {
    const hasEntityScript = this.hasEntityScript(entityHandle);
    const shouldLoadEntity =
      hasEntityScript &&
      (options.runBeforeReadScript !== false || options.includeAfterReadScript);
    const entity = shouldLoadEntity
      ? await this.em.findOne(EntityItem, { handle: entityHandle })
      : null;
    let nextWhere = where;

    if (entity && options.runBeforeReadScript !== false) {
      const script = await this.scriptService.runServer(
        ScriptMethods.beforeRead,
        nextWhere,
        entity,
        currentUser,
      );
      nextWhere = script.items;
    }

    nextWhere = this.genericFilterService.prepareReadCriteria(
      this.genericPermissionService.setTopLevelFilter(
        nextWhere,
        currentUser,
        entityHandle,
      ),
      template,
    );

    return { entity, where: nextWhere };
  }

  async applyAfterRead<T>(
    items: T,
    entity: EntityItem | null,
    currentUser: PersonItem,
  ): Promise<T> {
    if (!entity) {
      return items;
    }

    const script = await this.scriptService.runServer(
      ScriptMethods.afterRead,
      items as object | object[],
      entity,
      currentUser,
    );

    return script.items as T;
  }

  async findAndCount(
    entityHandle: string,
    entityClass: unknown,
    where: object,
    currentUser: PersonItem,
    template: EntityTemplateDto[] = [],
    ormOptions: {
      limit?: number;
      offset?: number;
      orderBy?: object;
      populate?: any[];
    } = {},
  ): Promise<{ entity: EntityItem | null; items: object[]; total: number }> {
    const prepared = await this.prepareWhere(
      entityHandle,
      where,
      currentUser,
      template,
      { includeAfterReadScript: true },
    );
    const result = await this.runReadQuery(entityHandle, async () =>
      this.em.findAndCount(entityClass as never, prepared.where, ormOptions),
    );

    return {
      entity: prepared.entity,
      items: result[0],
      total: result[1],
    };
  }

  async find(
    entityHandle: string,
    entityClass: unknown,
    where: object,
    currentUser: PersonItem,
    template: EntityTemplateDto[] = [],
    ormOptions: {
      limit?: number;
      offset?: number;
      orderBy?: object;
      populate?: any[];
      runBeforeReadScript?: boolean;
    } = {},
  ): Promise<{ entity: EntityItem | null; items: object[] }> {
    const { runBeforeReadScript, ...mikroOrmOptions } = ormOptions;
    const prepared = await this.prepareWhere(
      entityHandle,
      where,
      currentUser,
      template,
      { runBeforeReadScript },
    );
    const items = await this.runReadQuery(entityHandle, async () =>
      this.em.find(entityClass as never, prepared.where, mikroOrmOptions),
    );

    return {
      entity: prepared.entity,
      items,
    };
  }

  async findOne(
    entityHandle: string,
    entityClass: unknown,
    where: object,
    currentUser: PersonItem,
    template: EntityTemplateDto[] = [],
    ormOptions: {
      populate?: any[];
      runBeforeReadScript?: boolean;
    } = {},
  ): Promise<{
    entity: EntityItem | null;
    item: Record<string, unknown> | null;
  }> {
    const { runBeforeReadScript, ...mikroOrmOptions } = ormOptions;
    const prepared = await this.prepareWhere(
      entityHandle,
      where,
      currentUser,
      template,
      { runBeforeReadScript },
    );
    const item = await this.runReadQuery(entityHandle, async () =>
      this.em.findOne(entityClass as never, prepared.where, mikroOrmOptions),
    );

    return {
      entity: prepared.entity,
      item: item,
    };
  }

  private async runReadQuery<T>(
    entityHandle: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      global.log.error(`entity ${entityHandle}:`, error);

      if (error instanceof Error) {
        throw new BadRequestException(
          `global.${error.name.charAt(0).toLowerCase() + error.name.slice(1)}`,
          error.message,
        );
      }

      throw error;
    }
  }

  private hasEntityScript(entityHandle: string): boolean {
    const scriptService = this.scriptService as {
      hasEntityScript?: (entityHandle: string) => boolean;
    };

    if (typeof scriptService.hasEntityScript !== 'function') {
      return true;
    }

    return scriptService.hasEntityScript(entityHandle);
  }
}
